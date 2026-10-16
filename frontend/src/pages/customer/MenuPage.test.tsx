import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { menu } from '../../test/fixtures'
import { server } from '../../test/server'
import { createQueryClient } from '../../App'
import { API, renderApp } from '../../test/utils'
import MenuPage from './MenuPage'

const oldCache = (data: typeof menu) => localStorage.setItem('bdm.menu.v1', JSON.stringify({ at: Date.now() - 120_000, data }))

const serve = (data = menu) => server.use(http.get(`${API}/api/menu`, () => HttpResponse.json(data)))

describe('MenuPage (cliente)', () => {
  it('mostra o cardápio agrupado por categoria, com preço em reais e destaque', async () => {
    serve()
    renderApp(<MenuPage />)

    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Porções' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bar do Marcelo — Bar & Mercearia Planalto' })).toBeInTheDocument()
    const item = screen.getByRole('button', { name: /Cerveja Long Neck, R\$\s?9,00/ })
    expect(within(item).getByText('Destaque')).toBeInTheDocument()
    expect(within(item).getByText(/R\$\s?9,00/)).toBeInTheDocument()
    // a lista usa a miniatura leve (?size=thumb), não a foto inteira
    expect(item.querySelector('img')).toHaveAttribute('src', 'http://api.test/api/images/a.jpg?size=thumb')
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

  it('a página do cliente não tem nenhum link para a área do proprietário', async () => {
    serve()
    renderApp(<MenuPage />)
    await screen.findByRole('heading', { name: 'Cervejas' })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/proprietário/i)).not.toBeInTheDocument()
  })

  it('o detalhe do item mostra a foto inteira (não a miniatura)', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await user.click(await screen.findByRole('button', { name: /Cerveja Long Neck/ }))
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', 'http://api.test/api/images/a.jpg')
  })

  it('mostra o aviso "acordando" e continua tentando até o servidor responder', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/api/menu`, () => (++calls <= 2 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(menu))),
    )
    renderApp(<MenuPage />, { queryClient: createQueryClient({ retryDelay: () => 20 }) })

    expect(await screen.findByText(/Estamos acordando o cardápio/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(calls).toBe(3)
    expect(screen.queryByText(/Estamos acordando/)).not.toBeInTheDocument()
  })

  it('quem já visitou vê o cardápio salvo na hora, mesmo com a API fora do ar', async () => {
    oldCache(menu)
    server.use(http.get(`${API}/api/menu`, () => new HttpResponse(null, { status: 503 })))
    renderApp(<MenuPage />, { queryClient: createQueryClient({ retryDelay: () => 5 }) })

    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument() // sem esperar a API
    expect(screen.queryByRole('status', { name: 'Carregando cardápio' })).not.toBeInTheDocument()
    expect(await screen.findByText(/Mostrando o cardápio da sua última visita/, undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mesmo com cardápio salvo agora há pouco, sempre busca a versão atual (o dono pode ter mudado algo)', async () => {
    localStorage.setItem('bdm.menu.v1', JSON.stringify({ at: Date.now(), data: [{ id: 1, name: 'Antigo', items: [] }] }))
    serve()
    renderApp(<MenuPage />)

    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Antigo' })).not.toBeInTheDocument()
  })

  it('atualiza o cardápio salvo quando a API responde e guarda a versão nova', async () => {
    oldCache([{ id: 1, name: 'Antigo', items: [] }])
    serve()
    renderApp(<MenuPage />)

    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Antigo' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bdm.menu.v1')!).data).toEqual(menu)
  })

  it('busca sem resultado oferece "Limpar busca" e volta ao cardápio completo', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await user.type(await screen.findByRole('searchbox'), 'xyzxyz')
    expect(await screen.findByText(/Nenhum item encontrado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(await screen.findByRole('heading', { name: 'Cervejas' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('mostra "Voltar ao topo" só depois de rolar e rola para o início', async () => {
    serve()
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    const user = userEvent.setup()
    renderApp(<MenuPage />)
    await screen.findByRole('heading', { name: 'Cervejas' })
    expect(screen.queryByRole('button', { name: 'Voltar ao topo' })).toBeNull()

    Object.defineProperty(window, 'scrollY', { value: 1200, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    await user.click(await screen.findByRole('button', { name: 'Voltar ao topo' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    vi.unstubAllGlobals()
  })
})
