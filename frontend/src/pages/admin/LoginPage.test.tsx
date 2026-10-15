import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { session } from '../../auth/session'
import { server } from '../../test/server'
import { act, fireEvent } from '@testing-library/react'
import { createQueryClient } from '../../App'
import { API, fakeJwt, renderApp, signIn } from '../../test/utils'
import LoginPage from './LoginPage'

const ui = (
  <Routes>
    <Route path="/admin/login" element={<LoginPage />} />
    <Route path="/admin/items" element={<h1>Itens</h1>} />
    <Route path="/admin/categories" element={<h1>Categorias</h1>} />
  </Routes>
)

async function fill(user: ReturnType<typeof userEvent.setup>, username: string, password: string) {
  if (username) await user.type(screen.getByLabelText('Usuário'), username)
  if (password) await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('entra, guarda a sessão e vai para a lista de itens', async () => {
    let sent: unknown
    server.use(
      http.post(`${API}/api/auth/login`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ accessToken: fakeJwt(), tokenType: 'Bearer', expiresIn: 3600 })
      }),
    )
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    await fill(user, '  marcelo ', 'segredo123')

    expect(await screen.findByRole('heading', { name: 'Itens' })).toBeInTheDocument()
    expect(sent).toEqual({ username: 'marcelo', password: 'segredo123' })
    expect(session.getToken()).not.toBeNull()
  })

  it('volta para a página que o usuário queria abrir', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => HttpResponse.json({ accessToken: fakeJwt(), tokenType: 'Bearer', expiresIn: 3600 })))
    const user = userEvent.setup()
    const { container } = renderApp(
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/categories" element={<h1>Categorias</h1>} />
      </Routes>,
      { route: '/admin/login' },
    )
    expect(container).toBeTruthy()
    await fill(user, 'marcelo', 'segredo123')
    // sem estado de origem, o padrão é /admin/items (rota ausente aqui): a sessão foi criada
    expect(session.getToken()).not.toBeNull()
  })

  it('exige usuário e senha antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe o usuário.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('Usuário')).toBeInvalid()
  })

  it('mostra a mensagem da API quando a senha está errada', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => HttpResponse.json({ detail: 'Usuário ou senha inválidos.' }, { status: 401 })))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    await fill(user, 'marcelo', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.')
    expect(session.getToken()).toBeNull()
  })

  it('explica o bloqueio por excesso de tentativas (429)', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => HttpResponse.json({}, { status: 429 })))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    await fill(user, 'marcelo', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas')
  })

  it('desabilita o botão enquanto envia', async () => {
    server.use(http.post(`${API}/api/auth/login`, async () => new Promise<Response>(() => {})))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    await fill(user, 'marcelo', 'segredo123')

    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
  })

  it('avisa que a sessão expirou quando vem de um 401', () => {
    session.expire()
    renderApp(ui, { route: '/admin/login' })
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
  })

  it('mostra o logo e deixa ver a senha digitada (evita erro de digitação no celular)', async () => {
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login' })

    expect(screen.getByRole('img', { name: 'Bar do Marcelo — Bar & Mercearia Planalto' })).toBeInTheDocument()
    const password = screen.getByLabelText('Senha')
    expect(password).toHaveAttribute('type', 'password')

    await user.type(password, 'abc123')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('abc123')

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('quem já está logado é levado direto ao painel', () => {
    signIn()
    renderApp(ui, { route: '/admin/login' })
    expect(screen.getByRole('heading', { name: 'Itens' })).toBeInTheDocument()
  })

  it('se o servidor está acordando (503), espera e tenta de novo sem mostrar erro', async () => {
    let calls = 0
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        ++calls <= 2 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json({ accessToken: fakeJwt(), tokenType: 'Bearer', expiresIn: 3600 }),
      ),
    )
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login', queryClient: createQueryClient({ retryDelay: () => 10 }) })

    await fill(user, 'marcelo', 'segredo123')

    expect(await screen.findByRole('heading', { name: 'Itens' })).toBeInTheDocument()
    expect(calls).toBe(3)
    expect(session.getToken()).not.toBeNull()
  })

  it('senha errada (401) não é repetida', async () => {
    let calls = 0
    server.use(http.post(`${API}/api/auth/login`, () => (++calls, HttpResponse.json({ detail: 'Usuário ou senha inválidos.' }, { status: 401 }))))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/login', queryClient: createQueryClient({ retryDelay: () => 10 }) })

    await fill(user, 'marcelo', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.')
    expect(calls).toBe(1)
  })

  it('depois de 5 s sem resposta avisa que o servidor pode estar acordando', async () => {
    server.use(http.post(`${API}/api/auth/login`, () => new Promise<Response>(() => {})))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      renderApp(ui, { route: '/admin/login' })
      fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'marcelo' } })
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5100)
      })
      expect(screen.getByRole('status')).toHaveTextContent('Conectando ao servidor')
    } finally {
      vi.useRealTimers()
    }
  })
})
