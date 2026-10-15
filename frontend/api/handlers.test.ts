// @vitest-environment node
import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Sql } from './_lib/core'

const sql = vi.fn<Sql>()
const getSql = vi.fn(() => sql)
vi.mock('./_lib/db', () => ({ getSql: () => getSql() }))

import menu from './fast/menu'
import image from './fast/images/[filename]'

function call(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>, method: string, url: string, headers: Record<string, string> = {}) {
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: undefined as unknown, setHeader(n: string, v: string) { this.headers[n] = v }, end(c?: unknown) { this.body = c } }
  return handler({ method, url, headers } as unknown as IncomingMessage, res as unknown as ServerResponse).then(() => res)
}

beforeEach(() => sql.mockReset())

describe('/api/fast/menu', () => {
  it('lê o cardápio e responde JSON', async () => {
    sql.mockResolvedValue([{ category_id: '1', category_name: 'Cervejas', id: '7', name: 'Chopp', description: null, price: '8.50', image_filename: null, featured: false }])
    const res = await call(menu, 'GET', '/api/fast/menu')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(String(res.body))).toEqual([
      { id: 1, name: 'Cervejas', items: [{ id: 7, name: 'Chopp', description: '', price: 8.5, imageUrl: null, featured: false }] },
    ])
    expect(res.headers['X-Served-By']).toBe('vercel-function')
  })

  it('banco indisponível → 503 (o front então volta para a API do Render)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getSql.mockImplementationOnce(() => {
      throw new Error('connection refused')
    })
    expect((await call(menu, 'GET', '/api/fast/menu')).statusCode).toBe(503)
  })

  it('só aceita GET/HEAD', async () => {
    expect((await call(menu, 'POST', '/api/fast/menu')).statusCode).toBe(405)
  })
})

describe('/api/fast/images/[filename]', () => {
  const NAME = '11111111-1111-1111-1111-111111111111.jpg'

  it('serve a foto pelo nome no caminho e respeita ?size=thumb', async () => {
    sql.mockResolvedValue([{ content_type: 'image/jpeg', b64: Buffer.from('abc').toString('base64') }])
    const res = await call(image, 'GET', `/api/fast/images/${NAME}?size=thumb`)
    expect(res.statusCode).toBe(200)
    expect(Buffer.from(res.body as Buffer).toString()).toBe('abc')
    expect(sql.mock.calls[0][0]).toContain('coalesce(thumbnail, data)')
    expect(sql.mock.calls[0][1]).toEqual([NAME])
  })

  it('nome inválido → 404 sem consultar o banco', async () => {
    expect((await call(image, 'GET', '/api/fast/images/..%2Fsegredo')).statusCode).toBe(404)
    expect(sql).not.toHaveBeenCalled()
  })

  it('304 quando a foto não mudou, sem consultar o banco', async () => {
    const res = await call(image, 'GET', `/api/fast/images/${NAME}`, { 'if-none-match': `"${NAME}"` })
    expect(res.statusCode).toBe(304)
    expect(sql).not.toHaveBeenCalled()
  })
})
