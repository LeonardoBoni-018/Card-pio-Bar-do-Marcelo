import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { session } from '../../auth/session'
import { server } from '../../test/server'
import { API, fakeJwt, renderApp, signIn, signInWaiter } from '../../test/utils'
import GarcomApp from './GarcomApp'

const render = (route = '/garcom') =>
  renderApp(
    <Routes>
      <Route path="/garcom/*" element={<GarcomApp />} />
      <Route path="/admin/*" element={<p>Painel do proprietário</p>} />
    </Routes>,
    { route },
  )

const tables = [
  {
    id: 1,
    name: 'Mesa 1',
    displayOrder: 1,
    active: true,
    openTotal: 42.5,
    comandas: [{ id: 9, label: 'João', total: 42.5, itemCount: 3, openedBy: 'Ana', openedAt: '2026-11-11T20:00:00Z', version: 3 }],
  },
  { id: 2, name: 'Balcão', displayOrder: 2, active: true, openTotal: 0, comandas: [] },
]

describe('Área do garçom', () => {
  afterEach(() => session.clear())

  it('sem login, pede para entrar na tela do garçom', async () => {
    render()
    expect(await screen.findByRole('heading', { name: 'Área do garçom' })).toBeInTheDocument()
    expect(screen.getByText('Entre para lançar os pedidos das mesas.')).toBeInTheDocument()
  })

  it('garçom vê o nome e as mesas ativas', async () => {
    signInWaiter('João')
    server.use(http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json(tables)))
    render()
    expect(await screen.findByText('Olá, João')).toBeInTheDocument()
    expect(await screen.findByText('Balcão')).toBeInTheDocument()
    expect(screen.getByText('1 comanda')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s?42,50/)).toBeInTheDocument()
    expect(screen.getByText('Livre')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Painel' })).not.toBeInTheDocument()
  })

  it('sem mesas cadastradas, orienta a pedir ao proprietário', async () => {
    signInWaiter()
    server.use(http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json([])))
    render()
    expect(await screen.findByText(/Peça ao proprietário/)).toBeInTheDocument()
  })

  it('login de garçom leva para as mesas', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () => HttpResponse.json({ accessToken: fakeJwt(3600, { roles: ['GARCOM'], name: 'Ana' }), tokenType: 'Bearer', expiresIn: 3600 })),
      http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json(tables)),
    )
    const user = userEvent.setup()
    render('/garcom/login')
    await user.type(await screen.findByLabelText('Usuário'), 'ana')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Olá, Ana')).toBeInTheDocument()
  })

  it('proprietário também abre a área do garçom, com atalho para o painel', async () => {
    signIn()
    server.use(http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json(tables)))
    render()
    expect(await screen.findByRole('link', { name: 'Painel' })).toBeInTheDocument()
  })

  it('Sair encerra a sessão e volta ao login do garçom', async () => {
    signInWaiter()
    server.use(http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json(tables)))
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Área do garçom' })).toBeInTheDocument()
    expect(session.getToken()).toBeNull()
  })
})
