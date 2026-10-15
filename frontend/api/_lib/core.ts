import { createHash } from 'node:crypto'

/**
 * Leitura pública do cardápio e das fotos, para rodar em funções da Vercel (sempre disponíveis, sem "dormir").
 * Espelha exatamente a API Java (GET /api/menu e GET /api/images/{arquivo}); os testes conferem os mesmos casos.
 * Aqui só existem consultas de LEITURA, feitas com um usuário do banco que só enxerga as tabelas do cardápio.
 */

export type Row = Record<string, unknown>
export type Sql = (text: string, params?: unknown[]) => Promise<Row[]>

export interface Reply {
  status: number
  headers: Record<string, string>
  body: string | Buffer
}

const FILENAME = /^[0-9a-f-]{36}\.(jpg|png)$/
const SERVED_BY = { 'X-Served-By': 'vercel-function' }

// CDN guarda 15 s e pode servir a versão anterior por mais 60 s enquanto atualiza; o navegador sempre revalida.
const MENU_CACHE = 'public, max-age=0, s-maxage=15, stale-while-revalidate=60'
const IMAGE_CACHE = 'public, max-age=31536000, immutable' // nome é um UUID: o conteúdo nunca muda

export const problem = (status: number, title: string, detail: string, headers: Record<string, string> = {}): Reply => ({
  status,
  headers: { 'Content-Type': 'application/problem+json', ...SERVED_BY, ...headers },
  body: JSON.stringify({ type: 'about:blank', title, status, detail }),
})

const etagOf = (body: string): string => `"${createHash('sha1').update(body).digest('hex').slice(0, 32)}"`

const notModified = (etag: string, cache: string): Reply => ({ status: 304, headers: { ETag: etag, 'Cache-Control': cache, ...SERVED_BY }, body: '' })

const matches = (ifNoneMatch: string | undefined, etag: string): boolean =>
  (ifNoneMatch ?? '')
    .split(',')
    .map((value) => value.trim().replace(/^W\//, ''))
    .includes(etag)

export async function getMenu(sql: Sql, ifNoneMatch?: string): Promise<Reply> {
  const rows = await sql(
    `select c.id as category_id, c.name as category_name, i.id, i.name, i.description, i.price, i.image_filename, i.featured
       from menu_item i join category c on c.id = i.category_id
      where i.available = true
      order by c.display_order, c.name, i.featured desc, i.name`,
  )

  const categories = new Map<number, { id: number; name: string; items: object[] }>()
  for (const row of rows) {
    const categoryId = Number(row.category_id)
    let category = categories.get(categoryId)
    if (!category) {
      category = { id: categoryId, name: String(row.category_name), items: [] }
      categories.set(categoryId, category)
    }
    category.items.push({
      id: Number(row.id),
      name: String(row.name),
      description: String(row.description ?? ''),
      price: Number(row.price), // NUMERIC(10,2) chega como texto
      imageUrl: row.image_filename ? `/api/images/${String(row.image_filename)}` : null,
      featured: Boolean(row.featured),
    })
  }

  const body = JSON.stringify([...categories.values()])
  const etag = etagOf(body)
  if (matches(ifNoneMatch, etag)) return notModified(etag, MENU_CACHE)
  return { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': MENU_CACHE, ETag: etag, ...SERVED_BY }, body }
}

export async function getImage(sql: Sql, filename: string, size: string | undefined, ifNoneMatch?: string): Promise<Reply> {
  if (!FILENAME.test(filename)) return problem(404, 'Not Found', 'Imagem não encontrada.')

  const thumb = size === 'thumb'
  const etag = `"${filename}${thumb ? '-thumb' : ''}"`
  if (matches(ifNoneMatch, etag)) return notModified(etag, IMAGE_CACHE) // nem consulta o banco

  // a miniatura é nula em fotos antigas: nesse caso devolve a foto inteira
  const column = thumb ? 'coalesce(thumbnail, data)' : 'data'
  const rows = await sql(`select content_type, encode(${column}, 'base64') as b64 from image where filename = $1`, [filename])
  if (rows.length === 0) return problem(404, 'Not Found', 'Imagem não encontrada.')

  return {
    status: 200,
    headers: { 'Content-Type': String(rows[0].content_type), 'Cache-Control': IMAGE_CACHE, ETag: etag, ...SERVED_BY },
    body: Buffer.from(String(rows[0].b64), 'base64'),
  }
}
