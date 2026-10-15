// @vitest-environment node
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import type { Reply } from './core'
import { lastSegment, serve } from './serve'

function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    end(chunk?: unknown) {
      this.body = chunk
    },
  }
  return res
}
const req = (method: string, url = '/api/fast/menu', headers: Record<string, string | string[]> = {}) => ({ method, url, headers }) as unknown as IncomingMessage
const asRes = (r: ReturnType<typeof fakeRes>) => r as unknown as ServerResponse
const ok: Reply = { status: 200, headers: { 'Content-Type': 'application/json', ETag: '"x"' }, body: '[]' }

describe('serve', () => {
  it('responde GET com status, cabeçalhos e corpo', async () => {
    const res = fakeRes()
    await serve(req('GET'), asRes(res), async () => ok)
    expect(res.statusCode).toBe(200)
    expect(res.headers.ETag).toBe('"x"')
    expect(res.body).toBe('[]')
  })

  it('HEAD devolve só os cabeçalhos', async () => {
    const res = fakeRes()
    await serve(req('HEAD'), asRes(res), async () => ok)
    expect(res.statusCode).toBe(200)
    expect(res.body).toBeUndefined()
  })

  it('304 nunca leva corpo', async () => {
    const res = fakeRes()
    await serve(req('GET'), asRes(res), async () => ({ status: 304, headers: {}, body: 'lixo' }))
    expect(res.statusCode).toBe(304)
    expect(res.body).toBeUndefined()
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('%s → 405 e a função nem roda', async (method) => {
    const res = fakeRes()
    const run = vi.fn()
    await serve(req(method), asRes(res), run)
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('GET, HEAD')
    expect(run).not.toHaveBeenCalled()
  })

  it('passa If-None-Match (inclusive como lista) e a URL para a consulta', async () => {
    const run = vi.fn(async (context: { url: URL; ifNoneMatch?: string }) => (void context, ok))
    await serve(req('GET', '/api/fast/images/a.jpg?size=thumb', { 'if-none-match': ['"a"', '"b"'] }), asRes(fakeRes()), run)
    const context = run.mock.calls[0][0]
    expect(context.ifNoneMatch).toBe('"a","b"')
    expect(context.url.searchParams.get('size')).toBe('thumb')
  })

  it('erro na consulta vira 503 genérico, sem vazar detalhes, e fica registrado no log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const res = fakeRes()
    await serve(req('GET'), asRes(res), async () => {
      throw new Error('password authentication failed for user "cardapio_leitura" host ep-xyz')
    })
    expect(res.statusCode).toBe(503)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(String(res.body)).not.toMatch(/password|cardapio_leitura|ep-xyz/)
    expect(JSON.parse(String(res.body)).detail).toMatch(/indisponível/)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('lastSegment', () => {
  it('pega o último trecho do caminho, decodificado', () => {
    expect(lastSegment(new URL('http://x/api/fast/images/abc.jpg?size=thumb'))).toBe('abc.jpg')
    expect(lastSegment(new URL('http://x/api/fast/images/a%2Fb'))).toBe('a/b')
    expect(lastSegment(new URL('http://x/'))).toBe('')
  })
})
