import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { AppRoutes, createQueryClient } from './App'
import { ApiError } from './api/client'
import { session } from './auth/session'
import { adminItem, categories, menu, page } from './test/fixtures'
import { server } from './test/server'
import { API, signIn } from './test/utils'

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

describe('política de novas tentativas', () => {
  it('não insiste em erros 4xx, mas tenta de novo falhas de rede', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (count: number, error: Error) => boolean
    expect(retry(0, new ApiError(404, 'x'))).toBe(false)
    expect(retry(0, new ApiError(0, 'rede'))).toBe(true)
    expect(retry(0, new ApiError(500, 'x'))).toBe(true)
    expect(retry(2, new ApiError(500, 'x'))).toBe(false)
  })
})
