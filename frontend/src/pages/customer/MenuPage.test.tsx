import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { menu } from '../../test/fixtures'
import { server } from '../../test/server'
import { API, renderApp } from '../../test/utils'
import MenuPage from './MenuPage'

const serve = (data = menu) => server.use(http.get(`${API}/api/menu`, () => HttpResponse.json(data)))

describe('MenuPage (cliente)', () => {
  it('mostra o cardápio agrupado por categoria, com preço em reais e destaque', async () => {
    serve()
    renderApp(<MenuPage />)

    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Porções' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Bar do Marcelo' })).toBeInTheDocument()
    const item = screen.getByRole('button', { name: /Cerveja Long Neck, R\$\s?9,00/ })
    expect(within(item).getByText('Destaque')).toBeInTheDocument()
    expect(within(item).getByText(/R\$\s?9,00/)).toBeInTheDocument()
    expect(item.querySelector('img')).toHaveAttribute('src', 'http://api.test/api/images/a.jpg')
  })

  it('mostra um esqueleto enquanto carrega', () => {
    serve()
    renderApp(<MenuPage />)
    expect(screen.getByRole('status', { name: 'Carregando cardápio' })).toBeInTheDocument()
  })

  it('a busca ignora acento e maiúsculas e esconde categorias vazias', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await screen.findByRole('heading', { name: 'Cervejas' })

    await user.type(screen.getByRole('searchbox', { name: 'Buscar no cardápio' }), 'PAO')

    expect(screen.queryByRole('heading', { name: 'Cervejas' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Porções' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calabresa/ })).toBeInTheDocument()
  })

  it('avisa quando a busca não encontra nada', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await screen.findByRole('heading', { name: 'Cervejas' })

    await user.type(screen.getByRole('searchbox'), 'sushi')

    expect(screen.getByRole('status')).toHaveTextContent('Nenhum item encontrado para “sushi”')
    expect(screen.queryByRole('navigation', { name: 'Categorias do cardápio' })).not.toBeInTheDocument()
  })

  it('abre os detalhes do item e fecha ao clicar em Fechar', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await user.click(await screen.findByRole('button', { name: /Chopp/ }))

    const dialog = screen.getByRole('dialog', { name: 'Chopp' })
    expect(dialog).toHaveTextContent('Copo 300 ml')
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a barra de categorias leva até a seção escolhida', async () => {
    serve()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await screen.findByRole('heading', { name: 'Cervejas' })

    const nav = screen.getByRole('navigation', { name: 'Categorias do cardápio' })
    await user.click(within(nav).getByRole('button', { name: 'Porções' }))

    expect(scroll).toHaveBeenCalled()
    expect(within(nav).getByRole('button', { name: 'Porções' })).toHaveAttribute('aria-current', 'true')
  })

  it('cardápio vazio mostra uma mensagem amigável', async () => {
    serve([])
    renderApp(<MenuPage />)
    expect(await screen.findByText(/está sendo atualizado/)).toBeInTheDocument()
  })

  it('erro da API mostra mensagem e permite tentar de novo', async () => {
    server.use(http.get(`${API}/api/menu`, () => HttpResponse.error()))
    const user = userEvent.setup()
    renderApp(<MenuPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/conectar ao servidor/)

    serve()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
  })

  it('tem link discreto para a área do proprietário', async () => {
    serve()
    renderApp(<MenuPage />)
    expect(await screen.findByRole('link', { name: 'Área do proprietário' })).toHaveAttribute('href', '/admin')
  })
})
