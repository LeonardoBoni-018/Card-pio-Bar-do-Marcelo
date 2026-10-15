import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { adminItem, categories, page } from '../../test/fixtures'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import ItemsPage from './ItemsPage'

const items = [adminItem(), adminItem({ id: 2, name: 'Batata Frita', price: 32, categoryId: 2, categoryName: 'Porções', featured: true, available: false })]

function serve(data = page(items)) {
  signIn()
  const searches: string[] = []
  server.use(
    http.get(`${API}/api/admin/categories`, () => HttpResponse.json(categories)),
    http.get(`${API}/api/admin/items`, ({ request }) => {
      searches.push(new URL(request.url).search)
      return HttpResponse.json(data)
    }),
  )
  return searches
}

const ui = (
  <Routes>
    <Route path="/admin/items" element={<ItemsPage />} />
    <Route path="/admin/items/new" element={<h1>Novo</h1>} />
    <Route path="/admin/items/:id" element={<h1>Editar</h1>} />
    <Route path="/admin/categories" element={<h1>Categorias</h1>} />
  </Routes>
)

describe('ItemsPage (proprietário)', () => {
  it('lista os itens com categoria, preço, destaque e disponibilidade', async () => {
    serve()
    renderApp(ui, { route: '/admin/items' })

    expect(await screen.findByText('Chopp')).toBeInTheDocument()
    expect(screen.getByText('Batata Frita')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Disponível: Chopp' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Disponível: Batata Frita' })).not.toBeChecked()
    expect(screen.getByText('Batata Frita').closest('li')).toHaveTextContent(/Porções.*R\$\s?32,00.*Destaque/)
    expect(screen.getByRole('link', { name: /Novo item/ })).toHaveAttribute('href', '/admin/items/new')
    expect(screen.getByRole('link', { name: 'Editar Chopp' })).toHaveAttribute('href', '/admin/items/1')
  })

  it('liga/desliga a disponibilidade na hora (otimista) e confirma com a API', async () => {
    serve()
    let body: unknown
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.patch(`${API}/api/admin/items/1/availability`, async ({ request }) => {
        body = await request.json()
        await gate
        return HttpResponse.json(adminItem({ available: false }))
      }),
    )
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })

    const toggle = await screen.findByRole('switch', { name: 'Disponível: Chopp' })
    await user.click(toggle)

    await waitFor(() => expect(toggle).not.toBeChecked()) // antes de a API responder
    release()
    expect(await screen.findByText(/saiu do cardápio/)).toBeInTheDocument()
    expect(body).toEqual({ available: false })
  })

  it('desfaz a mudança e avisa se a API falhar', async () => {
    serve()
    server.use(http.patch(`${API}/api/admin/items/1/availability`, () => HttpResponse.json({ detail: 'Item não encontrado.' }, { status: 404 })))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })

    const toggle = await screen.findByRole('switch', { name: 'Disponível: Chopp' })
    await user.click(toggle)

    expect(await screen.findByRole('alert')).toHaveTextContent('Item não encontrado.')
    await waitFor(() => expect(toggle).toBeChecked())
  })

  it('só exclui depois de confirmar', async () => {
    serve()
    let deleted = false
    server.use(http.delete(`${API}/api/admin/items/1`, () => ((deleted = true), new HttpResponse(null, { status: 204 }))))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })

    await user.click(await screen.findByRole('button', { name: 'Excluir Chopp' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir este item?' })
    expect(dialog).toHaveTextContent('“Chopp” será removido')

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(deleted).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Excluir Chopp' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('“Chopp” foi excluído.')).toBeInTheDocument()
    expect(deleted).toBe(true)
  })

  it('busca pelo nome com atraso e guarda a busca na URL', async () => {
    const searches = serve()
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })
    await screen.findByText('Chopp')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar item pelo nome' }), 'bat')

    await waitFor(() => expect(searches.at(-1)).toContain('q=bat'))
    expect(searches.filter((s) => s.includes('q=')).length).toBeLessThanOrEqual(2) // não consulta a cada tecla
  })

  it('filtra por categoria', async () => {
    const searches = serve()
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })
    await screen.findByText('Chopp')

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filtrar por categoria' }), 'Porções')

    await waitFor(() => expect(searches.at(-1)).toContain('categoryId=2'))
  })

  it('pagina: Próxima pede a página seguinte', async () => {
    const searches = serve(page(items, { totalPages: 3, totalElements: 50 }))
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    await waitFor(() => expect(searches.at(-1)).toContain('page=1'))
  })

  it('lista vazia convida a cadastrar o primeiro item', async () => {
    serve(page([]))
    renderApp(ui, { route: '/admin/items' })

    expect(await screen.findByText('Você ainda não cadastrou nenhum item.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar primeiro item' })).toBeInTheDocument()
  })

  it('busca sem resultado orienta a mudar os filtros', async () => {
    serve(page([]))
    renderApp(ui, { route: '/admin/items?q=zzz' })
    expect(await screen.findByText('Nenhum item encontrado.')).toBeInTheDocument()
  })

  it('sem categorias, pede para criar uma antes', async () => {
    signIn()
    server.use(
      http.get(`${API}/api/admin/categories`, () => HttpResponse.json([])),
      http.get(`${API}/api/admin/items`, () => HttpResponse.json(page([]))),
    )
    renderApp(ui, { route: '/admin/items' })

    expect(await screen.findByText(/crie ao menos uma categoria/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar categoria' })).toHaveAttribute('href', '/admin/categories')
    expect(screen.queryByRole('link', { name: 'Cadastrar primeiro item' })).not.toBeInTheDocument()
  })

  it('erro ao listar mostra mensagem e permite tentar de novo', async () => {
    signIn()
    server.use(
      http.get(`${API}/api/admin/categories`, () => HttpResponse.json(categories)),
      http.get(`${API}/api/admin/items`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderApp(ui, { route: '/admin/items' })
    expect(await screen.findByRole('alert')).toHaveTextContent('O servidor teve um problema')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  describe('resumo e filtros rápidos', () => {
    const many = [
      adminItem({ id: 1, name: 'Chopp', imageUrl: '/api/images/a.jpg' }),
      adminItem({ id: 2, name: 'Batata Frita', available: false, featured: true }),
      adminItem({ id: 3, name: 'Suco', imageUrl: '/api/images/b.jpg', available: false }),
    ]

    it('mostra totais e filtra por indisponíveis, sem foto e destaques (liga e desliga)', async () => {
      serve(page(many))
      const user = userEvent.setup()
      renderApp(ui, { route: '/admin/items' })

      expect(await screen.findByText(/3 itens · 1 no cardápio agora/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Indisponíveis: 2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sem foto: 1' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Indisponíveis: 2' }))
      expect(await screen.findByRole('button', { name: 'Indisponíveis: 2' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByText('Chopp')).toBeNull()
      expect(screen.getByText('Batata Frita')).toBeInTheDocument()
      expect(screen.getByText('Suco')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Destaques: 1' }))
      expect(screen.queryByText('Suco')).toBeNull()
      expect(screen.getByText('Batata Frita')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Destaques: 1' }))
      expect(await screen.findByText('Chopp')).toBeInTheDocument()
    })

    it('filtro sem resultado mostra a mensagem de vazio', async () => {
      serve(page([adminItem({ imageUrl: '/api/images/a.jpg' })]))
      const user = userEvent.setup()
      renderApp(ui, { route: '/admin/items' })
      await user.click(await screen.findByRole('button', { name: 'Sem foto: 0' }))
      expect(await screen.findByText('Nenhum item encontrado.')).toBeInTheDocument()
    })
  })

  it('estrela liga/desliga o destaque enviando o item completo', async () => {
    serve()
    let sent: unknown
    server.use(
      http.put(`${API}/api/admin/items/1`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(adminItem({ featured: true }))
      }),
    )
    const user = userEvent.setup()
    renderApp(ui, { route: '/admin/items' })

    await user.click(await screen.findByRole('button', { name: 'Destacar Chopp' }))

    await waitFor(() => expect(sent).toEqual({ name: 'Chopp', description: 'Copo 300 ml', price: 8.5, categoryId: 1, imageFilename: null, available: true, featured: true }))
    expect(await screen.findByText('“Chopp” ganhou destaque.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Destacar Batata Frita' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('duplicar leva ao cadastro com o item de origem', async () => {
    serve()
    renderApp(ui, { route: '/admin/items' })
    expect(await screen.findByRole('link', { name: 'Duplicar Chopp' })).toHaveAttribute('href', '/admin/items/new?copiar=1')
  })
})
