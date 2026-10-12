import { http, HttpResponse } from 'msw'
import { session } from '../auth/session'
import { server } from '../test/server'
import { API, signIn } from '../test/utils'
import { ApiError, imageSrc, request } from './client'

describe('request', () => {
  it('devolve o JSON em caso de sucesso e trata 204 sem corpo', async () => {
    server.use(
      http.get(`${API}/api/x`, () => HttpResponse.json({ ok: true })),
      http.delete(`${API}/api/y`, () => new HttpResponse(null, { status: 204 })),
    )
    await expect(request('/api/x')).resolves.toEqual({ ok: true })
    await expect(request('/api/y', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('envia o token só quando auth=true', async () => {
    signIn()
    const seen: Array<string | null> = []
    server.use(http.get(`${API}/api/x`, ({ request: r }) => (seen.push(r.headers.get('authorization')), HttpResponse.json({}))))
    await request('/api/x')
    await request('/api/x', { auth: true })
    expect(seen[0]).toBeNull()
    expect(seen[1]).toBe(`Bearer ${session.getToken()}`)
  })

  it('envia JSON e FormData com o cabeçalho certo', async () => {
    let contentType: string | null = null
    let body: unknown
    server.use(
      http.post(`${API}/api/j`, async ({ request: r }) => ((contentType = r.headers.get('content-type')), (body = await r.json()), HttpResponse.json({}))),
      http.post(`${API}/api/f`, async ({ request: r }) => HttpResponse.json({ type: r.headers.get('content-type') })),
    )
    await request('/api/j', { method: 'POST', json: { a: 1 } })
    expect(contentType).toBe('application/json')
    expect(body).toEqual({ a: 1 })
    const form = new FormData()
    form.append('file', new File(['x'], 'a.png', { type: 'image/png' }))
    const result = await request<{ type: string }>('/api/f', { method: 'POST', form })
    expect(result.type).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('usa a mensagem (detail) e os erros por campo da API', async () => {
    server.use(http.post(`${API}/api/x`, () => HttpResponse.json({ detail: 'Dados inválidos.', errors: { name: 'obrigatório' } }, { status: 400 })))
    const error = await request('/api/x', { method: 'POST' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'Dados inválidos.', fieldErrors: { name: 'obrigatório' } })
  })

  it('traduz status sem detalhe e esconde erros 5xx', async () => {
    server.use(
      http.get(`${API}/api/a`, () => new HttpResponse(null, { status: 429 })),
      http.get(`${API}/api/b`, () => HttpResponse.json({ detail: 'NullPointerException em X' }, { status: 500 })),
      http.get(`${API}/api/c`, () => new HttpResponse(null, { status: 418 })),
    )
    await expect(request('/api/a')).rejects.toThrow(/Muitas tentativas/)
    await expect(request('/api/b')).rejects.toThrow('O servidor teve um problema. Tente novamente em instantes.')
    await expect(request('/api/c')).rejects.toThrow('Algo deu errado.')
  })

  it('falha de rede vira mensagem amigável com status 0', async () => {
    server.use(http.get(`${API}/api/x`, () => HttpResponse.error()))
    await expect(request('/api/x')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('conectar') })
  })

  it('cancelamento (AbortSignal) não vira erro amigável', async () => {
    server.use(http.get(`${API}/api/x`, () => HttpResponse.json({})))
    const controller = new AbortController()
    controller.abort()
    await expect(request('/api/x', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('401 em rota autenticada encerra a sessão e marca o aviso de expiração', async () => {
    signIn()
    server.use(http.get(`${API}/api/admin/items`, () => HttpResponse.json({}, { status: 401 })))
    await expect(request('/api/admin/items', { auth: true })).rejects.toMatchObject({ status: 401 })
    expect(session.getToken()).toBeNull()
    expect(session.consumeExpiredNotice()).toBe(true)
  })

  it('401 sem auth (ex.: login com senha errada) não mexe na sessão', async () => {
    signIn()
    server.use(http.post(`${API}/api/auth/login`, () => HttpResponse.json({ detail: 'Usuário ou senha inválidos.' }, { status: 401 })))
    await expect(request('/api/auth/login', { method: 'POST' })).rejects.toThrow('Usuário ou senha inválidos.')
    expect(session.getToken()).not.toBeNull()
  })
})

describe('imageSrc', () => {
  it('prefixa a URL da API e aceita vazio', () => {
    expect(imageSrc('/api/images/a.jpg')).toBe('http://api.test/api/images/a.jpg')
    expect(imageSrc(null)).toBeNull()
    expect(imageSrc(undefined)).toBeNull()
  })
})
