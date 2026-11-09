import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { AppRoutes, createQueryClient } from './App'
import { ApiError } from './api/client'
import { session } from './auth/session'
import { adminItem, categories, menu, page } from './test/fixtures'
import { server } from './test/server'
import { API, fakeJwt, signIn } from './test/utils'

function renderAt(route: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  server.use(
    http.get(`${API}/api/menu`, () => HttpResponse.json(menu)),
    http.get(`${API}/api/admin/categories`, () => HttpResponse.json(categories)),
    http.get(`${API}/api/admin/items`, () => HttpResponse.json(page([adminItem()]))),
  )
})

describe('rotas', () => {
  it('"/" é o cardápio público, sem exigir login', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
  })

  it('rota desconhecida cai no cardápio', async () => {
    renderAt('/qualquer-coisa')
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
  })

  it('/admin sem login leva para a tela de login (painel carregado sob demanda)', async () => {
    renderAt('/admin/items')
    expect(await screen.findByRole('heading', { name: 'Área do proprietário' })).toBeInTheDocument()
  })

  it('/admin com login abre a lista de itens', async () => {
    signIn()
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Itens do cardápio' })).toBeInTheDocument()
    expect(await screen.findByText('Chopp')).toBeInTheDocument()
  })

  it('navega entre itens e categorias pelo menu do painel', async () => {
    signIn()
    const user = userEvent.setup()
    renderAt('/admin/items')
    await screen.findByRole('heading', { name: 'Itens do cardápio' })

    await user.click(screen.getByRole('link', { name: 'Categorias' }))
    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
  })

  it('Sair encerra a sessão e volta ao login', async () => {
    signIn()
    const user = userEvent.setup()
    renderAt('/admin/items')

    await user.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('heading', { name: 'Área do proprietário' })).toBeInTheDocument()
    expect(session.getToken()).toBeNull()
  })

  it('token recusado pela API (401) derruba a sessão e explica no login', async () => {
    signIn()
    server.use(http.get(`${API}/api/admin/items`, () => HttpResponse.json({}, { status: 401 })))
    renderAt('/admin/items')

    expect(await screen.findByRole('heading', { name: 'Área do proprietário' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
  })
})

describe('área do garçom (em construção)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('com a chave desligada, /garcom continua mostrando o cardápio', async () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '')
    renderAt('/garcom')
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Área do garçom' })).not.toBeInTheDocument()
  })

  it('com a chave ligada, /garcom abre a área do garçom', async () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '1')
    renderAt('/garcom')
    expect(await screen.findByRole('heading', { name: 'Área do garçom' })).toBeInTheDocument()
  })

  it('garçom que abre /admin é levado para a área dele', async () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '1')
    session.set(fakeJwt(3600, { roles: ['GARCOM'], name: 'João' }))
    server.use(http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json([])))
    renderAt('/admin/items')
    expect(await screen.findByText('Olá, João')).toBeInTheDocument()
  })

  it('com a chave ligada, o painel ganha "Salão" (mesas e garçons) no lugar de "Cardápio"', async () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '1')
    signIn()
    server.use(
      http.get(`${API}/api/admin/mesas`, () => HttpResponse.json([])),
      http.get(`${API}/api/admin/garcons`, () => HttpResponse.json([])),
    )
    const user = userEvent.setup()
    renderAt('/admin/items')
    const nav = await screen.findByRole('navigation', { name: 'Painel' })
    expect(within(nav).queryByText('Cardápio')).not.toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: 'Salão' }))
    expect(await screen.findByText(/Nenhuma mesa ainda/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Garçons' }))
    expect(await screen.findByText(/Nenhum garçom ainda/)).toBeInTheDocument()
  })

  it('com a chave desligada, o painel não tem "Salão"', async () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '')
    signIn()
    renderAt('/admin/items')
    const nav = await screen.findByRole('navigation', { name: 'Painel' })
    expect(within(nav).getByText('Cardápio')).toBeInTheDocument()
    expect(within(nav).queryByText('Salão')).not.toBeInTheDocument()
  })
})

describe('política de novas tentativas', () => {
  const retry = () => createQueryClient().getDefaultOptions().queries?.retry as (count: number, error: Error) => boolean

  it('nunca insiste em erros 4xx', () => {
    expect(retry()(0, new ApiError(404, 'x'))).toBe(false)
    expect(retry()(0, new ApiError(401, 'x'))).toBe(false)
  })

  it('insiste enquanto o servidor acorda (rede, 502/503/504) e em erros 5xx, mas não para sempre', () => {
    expect(retry()(0, new ApiError(0, 'rede'))).toBe(true)
    expect(retry()(5, new ApiError(503, 'x'))).toBe(true)
    expect(retry()(0, new ApiError(500, 'x'))).toBe(true)
    expect(retry()(12, new ApiError(503, 'x'))).toBe(false)
  })
})
