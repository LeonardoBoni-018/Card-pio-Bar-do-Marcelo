// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getImage, getMenu, type Sql } from './core'
import { createTestDb } from './pgTestDb'

const url = process.env.TEST_DATABASE_URL
const UUID_A = '11111111-1111-1111-1111-111111111111.jpg'
const UUID_B = '22222222-2222-2222-2222-222222222222.png'

describe.skipIf(!url)('leitura pública (PostgreSQL real, mesmas migrações do back-end)', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    db = await createTestDb(url!)
  })
  afterAll(async () => db?.close())
  beforeEach(async () => db.reset())

  const category = async (name: string, order: number) =>
    (await db.exec('insert into category (name, display_order) values ($1, $2) returning id', [name, order])).rows[0].id as string
  const item = (name: string, price: string, categoryId: string, opts: { available?: boolean; featured?: boolean; image?: string } = {}) =>
    db.exec(
      `insert into menu_item (name, description, price, image_filename, available, featured, category_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [name, `desc ${name}`, price, opts.image ?? null, opts.available ?? true, opts.featured ?? false, categoryId],
    )
  const body = async (reply: ReturnType<typeof getMenu>) => JSON.parse(String((await reply).body))

  describe('getMenu', () => {
    it('sem itens devolve lista vazia', async () => {
      const reply = await getMenu(db.sql)
      expect(reply.status).toBe(200)
      expect(JSON.parse(String(reply.body))).toEqual([])
    })

    it('agrupa por categoria, ordena (categoria, destaque, nome) e esconde indisponíveis e categorias vazias', async () => {
      const drinks = await category('Bebidas', 2)
      const beers = await category('Cervejas', 1)
      await category('Vazia', 3)
      await item('Chopp', '8.50', beers)
      await item('Long Neck', '9.00', beers, { featured: true, image: UUID_A })
      await item('Esgotada', '10.00', beers, { available: false })
      await item('Suco', '8.00', drinks)

      const menu = await body(getMenu(db.sql))

      expect(menu.map((c: { name: string }) => c.name)).toEqual(['Cervejas', 'Bebidas'])
      expect(menu[0].items.map((i: { name: string }) => i.name)).toEqual(['Long Neck', 'Chopp']) // destaque primeiro
      expect(menu[0].items[0]).toEqual({
        id: expect.any(Number),
        name: 'Long Neck',
        description: 'desc Long Neck',
        price: 9, // número, não texto
        imageUrl: `/api/images/${UUID_A}`,
        featured: true,
      })
      expect(menu[0].items[1].imageUrl).toBeNull()
      expect(menu[1].items).toHaveLength(1)
      expect(typeof menu[0].id).toBe('number')
    })

    it('não expõe campos internos', async () => {
      await item('Chopp', '8.50', await category('Cervejas', 1), { image: UUID_A })
      const [first] = (await body(getMenu(db.sql)))[0].items
      expect(Object.keys(first).sort()).toEqual(['description', 'featured', 'id', 'imageUrl', 'name', 'price'])
    })

    it('envia cabeçalhos de cache e ETag; revalidação devolve 304 sem corpo', async () => {
      await item('Chopp', '8.50', await category('Cervejas', 1))
      const first = await getMenu(db.sql)
      expect(first.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=15, stale-while-revalidate=60')
      expect(first.headers['Content-Type']).toBe('application/json')
      expect(first.headers['X-Served-By']).toBe('vercel-function')
      const etag = first.headers.ETag
      expect(etag).toMatch(/^"[0-9a-f]{32}"$/)

      const again = await getMenu(db.sql, etag)
      expect(again.status).toBe(304)
      expect(again.body).toBe('')
      expect((await getMenu(db.sql, `W/${etag}`)).status).toBe(304)
      expect((await getMenu(db.sql, `"outro", ${etag}`)).status).toBe(304)
    })

    it('o ETag muda quando o cardápio muda', async () => {
      const beers = await category('Cervejas', 1)
      await item('Chopp', '8.50', beers)
      const before = (await getMenu(db.sql)).headers.ETag
      await db.exec("update menu_item set price = 9.90 where name = 'Chopp'")
      const after = await getMenu(db.sql, before)
      expect(after.status).toBe(200)
      expect(after.headers.ETag).not.toBe(before)
      expect(JSON.parse(String(after.body))[0].items[0].price).toBe(9.9)
    })
  })

  describe('getImage', () => {
    const store = (filename: string, type: string, data: Buffer, thumb: Buffer | null) =>
      db.exec('insert into image (filename, content_type, data, thumbnail, created_at) values ($1, $2, $3, $4, now())', [filename, type, data, thumb])

    it('devolve os bytes exatos da foto, com tipo e cache de 1 ano', async () => {
      const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 250, 251, 0, 7])
      await store(UUID_A, 'image/jpeg', bytes, null)

      const reply = await getImage(db.sql, UUID_A, undefined)

      expect(reply.status).toBe(200)
      expect(Buffer.compare(reply.body as Buffer, bytes)).toBe(0)
      expect(reply.headers['Content-Type']).toBe('image/jpeg')
      expect(reply.headers['Cache-Control']).toBe('public, max-age=31536000, immutable')
      expect(reply.headers.ETag).toBe(`"${UUID_A}"`)
    })

    it('?size=thumb devolve a miniatura (com ETag próprio); sem miniatura devolve a foto inteira', async () => {
      const full = Buffer.from('FOTO-GRANDE'.repeat(10))
      const thumb = Buffer.from('mini')
      await store(UUID_A, 'image/jpeg', full, thumb)
      await store(UUID_B, 'image/png', full, null)

      const small = await getImage(db.sql, UUID_A, 'thumb')
      expect(Buffer.compare(small.body as Buffer, thumb)).toBe(0)
      expect(small.headers.ETag).toBe(`"${UUID_A}-thumb"`)

      const legacy = await getImage(db.sql, UUID_B, 'thumb')
      expect(Buffer.compare(legacy.body as Buffer, full)).toBe(0)
      expect(legacy.headers['Content-Type']).toBe('image/png')
    })

    it('foto inexistente → 404 em formato problem+json', async () => {
      const reply = await getImage(db.sql, UUID_A, undefined)
      expect(reply.status).toBe(404)
      expect(reply.headers['Content-Type']).toBe('application/problem+json')
      expect(JSON.parse(String(reply.body))).toMatchObject({ status: 404, detail: 'Imagem não encontrada.' })
    })
  })
})

// Estes não precisam de banco: provam que entradas inválidas e revalidações nem chegam a consultá-lo.
describe('proteções (banco falso que explode se for consultado)', () => {
  const explode: Sql = () => {
    throw new Error('o banco não deveria ser consultado')
  }

  it.each(['../etc/passwd', '..%2F..%2Fetc%2Fpasswd', 'foto.gif', 'FOTO.JPG', '', 'a'.repeat(300) + '.jpg', `${UUID_A}/extra`, `${UUID_A}.exe`])(
    'nome inválido "%s" → 404 sem consultar o banco',
    async (name) => {
      const reply = await getImage(explode, name, undefined)
      expect(reply.status).toBe(404)
    },
  )

  it('revalidação de foto (If-None-Match) responde 304 sem consultar o banco', async () => {
    const reply = await getImage(explode, UUID_A, undefined, `"${UUID_A}"`)
    expect(reply.status).toBe(304)
    expect(reply.body).toBe('')
    expect(reply.headers['Cache-Control']).toBe('public, max-age=31536000, immutable')
    expect((await getImage(explode, UUID_A, 'thumb', `"${UUID_A}-thumb"`)).status).toBe(304)
  })

  it('o ETag da foto inteira não vale para a miniatura (e vice-versa)', async () => {
    await expect(getImage(explode, UUID_A, 'thumb', `"${UUID_A}"`)).rejects.toThrow('banco')
  })
})
