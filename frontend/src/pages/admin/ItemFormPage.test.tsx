import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { adminItem, categories } from '../../test/fixtures'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import ItemFormPage from './ItemFormPage'

const ui = (
  <Routes>
    <Route path="/admin/items/new" element={<ItemFormPage />} />
    <Route path="/admin/items/:id" element={<ItemFormPage />} />
    <Route path="/admin/items" element={<h1>Lista de itens</h1>} />
  </Routes>
)

const png = () => new File(['conteudo'], 'foto.png', { type: 'image/png' })

async function renderForm(route: string) {
  renderApp(ui, { route })
  await screen.findByRole('button', { name: 'Salvar item' })
}

function setup() {
  signIn()
  const requests: Array<{ method: string; body: unknown }> = []
  server.use(http.get(`${API}/api/admin/categories`, () => HttpResponse.json(categories)))
  return requests
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), '  Chopp Claro ')
  await user.type(screen.getByLabelText('Descrição'), 'Copo 300 ml')
  await user.type(screen.getByLabelText('Preço (R$)'), '8,5')
  await user.selectOptions(screen.getByLabelText('Categoria'), 'Cervejas')
}

describe('ItemFormPage — novo item', () => {
  it('valida os campos obrigatórios antes de enviar', async () => {
    setup()
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByText('Informe o nome do item.')).toBeInTheDocument()
    expect(screen.getByText('Informe o preço.')).toBeInTheDocument()
    expect(screen.getByText('Escolha uma categoria.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInvalid()
  })

  it('rejeita preço que não é número', async () => {
    setup()
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await user.type(screen.getByLabelText('Preço (R$)'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByText(/Preço inválido/)).toBeInTheDocument()
  })

  it('cria o item convertendo preço "8,5" em 8.5 e volta para a lista', async () => {
    setup()
    let sent: unknown
    server.use(http.post(`${API}/api/admin/items`, async ({ request }) => ((sent = await request.json()), HttpResponse.json(adminItem({ name: 'Chopp Claro' }), { status: 201 }))))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByRole('heading', { name: 'Lista de itens' })).toBeInTheDocument()
    expect(sent).toEqual({
      name: 'Chopp Claro',
      description: 'Copo 300 ml',
      price: 8.5,
      categoryId: 1,
      imageFilename: null,
      available: true,
      featured: false,
    })
    expect(await screen.findByText('“Chopp Claro” foi adicionado ao cardápio.')).toBeInTheDocument()
  })

  it('envia a foto, mostra a pré-visualização e inclui o arquivo no item', async () => {
    setup()
    let sent: { imageFilename?: string } = {}
    server.use(
      http.post(`${API}/api/admin/images`, () => HttpResponse.json({ filename: 'abc.jpg', url: '/api/images/abc.jpg' }, { status: 201 })),
      http.post(`${API}/api/admin/items`, async ({ request }) => ((sent = (await request.json()) as typeof sent), HttpResponse.json(adminItem(), { status: 201 }))),
    )
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.upload(screen.getByLabelText('Foto'), png())

    expect(await screen.findByRole('img', { name: 'Pré-visualização da foto do item' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Trocar foto' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    await screen.findByRole('heading', { name: 'Lista de itens' })
    expect(sent.imageFilename).toBe('abc.jpg')
  })

  it('bloqueia o salvamento enquanto a foto está sendo enviada', async () => {
    setup()
    server.use(http.post(`${API}/api/admin/images`, () => new Promise<Response>(() => {})))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await user.upload(screen.getByLabelText('Foto'), png())

    expect(await screen.findByRole('button', { name: 'Enviando foto…' })).toBeDisabled()
  })

  it('recusa arquivo que não é JPG/PNG e foto acima de 5 MB sem chamar a API', async () => {
    setup()
    const user = userEvent.setup({ applyAccept: false })
    await renderForm('/admin/items/new')

    await user.upload(screen.getByLabelText('Foto'), new File(['x'], 'doc.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Formato não suportado')

    const big = new File(['x'], 'grande.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    await user.upload(screen.getByLabelText('Foto'), big)
    expect(await screen.findByRole('alert')).toHaveTextContent('passa de 5 MB')
  })

  it('mostra o erro do servidor quando o envio da foto falha e permite remover', async () => {
    setup()
    server.use(http.post(`${API}/api/admin/images`, () => HttpResponse.json({ detail: 'Arquivo de imagem corrompido.' }, { status: 400 })))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await user.upload(screen.getByLabelText('Foto'), png())

    expect(await screen.findByRole('alert')).toHaveTextContent('Arquivo de imagem corrompido.')
    expect(screen.getByRole('button', { name: 'Escolher foto' })).toBeEnabled()
  })

  it('remover a foto zera o arquivo do item', async () => {
    setup()
    let sent: { imageFilename?: string | null } = {}
    server.use(
      http.post(`${API}/api/admin/images`, () => HttpResponse.json({ filename: 'abc.jpg', url: '/api/images/abc.jpg' }, { status: 201 })),
      http.post(`${API}/api/admin/items`, async ({ request }) => ((sent = (await request.json()) as typeof sent), HttpResponse.json(adminItem(), { status: 201 }))),
    )
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.upload(screen.getByLabelText('Foto'), png())
    await user.click(await screen.findByRole('button', { name: 'Remover foto' }))
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    await screen.findByRole('heading', { name: 'Lista de itens' })
    expect(sent.imageFilename).toBeNull()
  })

  it('mostra erros de campo devolvidos pelo servidor no campo certo', async () => {
    setup()
    server.use(http.post(`${API}/api/admin/items`, () => HttpResponse.json({ detail: 'Dados inválidos.', errors: { name: 'já existe um item com esse nome' } }, { status: 400 })))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByText('já existe um item com esse nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInvalid()
    expect(screen.queryByRole('heading', { name: 'Lista de itens' })).not.toBeInTheDocument()
  })

  it('erro geral do servidor aparece como aviso', async () => {
    setup()
    server.use(http.post(`${API}/api/admin/items`, () => HttpResponse.json({ detail: 'Categoria não encontrada.' }, { status: 404 })))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Categoria não encontrada.')
  })

  it('alterna disponibilidade e destaque', async () => {
    setup()
    let sent: { available?: boolean; featured?: boolean } = {}
    server.use(http.post(`${API}/api/admin/items`, async ({ request }) => ((sent = (await request.json()) as typeof sent), HttpResponse.json(adminItem(), { status: 201 }))))
    const user = userEvent.setup()
    await renderForm('/admin/items/new')

    await fillValid(user)
    await user.click(screen.getByRole('switch', { name: 'Disponível no cardápio' }))
    await user.click(screen.getByRole('switch', { name: 'Destacar item' }))
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    await screen.findByRole('heading', { name: 'Lista de itens' })
    expect(sent).toMatchObject({ available: false, featured: true })
  })
})

describe('ItemFormPage — editar item', () => {
  it('carrega os dados do item, formata o preço e salva com PUT', async () => {
    setup()
    let sent: unknown
    server.use(
      http.get(`${API}/api/admin/items/7`, () => HttpResponse.json(adminItem({ id: 7, name: 'Batata', price: 32, categoryId: 2, imageFilename: 'x.jpg', imageUrl: '/api/images/x.jpg', featured: true }))),
      http.put(`${API}/api/admin/items/7`, async ({ request }) => ((sent = await request.json()), HttpResponse.json(adminItem({ id: 7, name: 'Batata Grande' })))),
    )
    const user = userEvent.setup()
    await renderForm('/admin/items/7')

    expect(screen.getByDisplayValue('Batata')).toBeInTheDocument()
    expect(screen.getByLabelText('Preço (R$)')).toHaveValue('32,00')
    expect(screen.getByLabelText('Categoria')).toHaveValue('2')
    expect(screen.getByRole('img', { name: 'Pré-visualização da foto do item' })).toHaveAttribute('src', 'http://api.test/api/images/x.jpg')
    expect(screen.getByRole('switch', { name: 'Destacar item' })).toBeChecked()

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Batata Grande')
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))

    expect(await screen.findByText('“Batata Grande” foi atualizado.')).toBeInTheDocument()
    expect(sent).toMatchObject({ name: 'Batata Grande', price: 32, categoryId: 2, imageFilename: 'x.jpg', featured: true })
  })

  it('mostra a categoria salva mesmo quando as categorias chegam depois do item', async () => {
    signIn()
    server.use(
      http.get(`${API}/api/admin/categories`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 80))
        return HttpResponse.json(categories)
      }),
      http.get(`${API}/api/admin/items/7`, () => HttpResponse.json(adminItem({ id: 7, categoryId: 2 }))),
    )
    await renderForm('/admin/items/7')
    expect(screen.getByLabelText('Categoria')).toHaveValue('2')
  })

  it('falha ao carregar categorias mostra erro em vez de um formulário quebrado', async () => {
    signIn()
    server.use(http.get(`${API}/api/admin/categories`, () => HttpResponse.json({}, { status: 500 })))
    renderApp(ui, { route: '/admin/items/new' })
    expect(await screen.findByRole('alert')).toHaveTextContent('O servidor teve um problema')
    expect(screen.queryByRole('button', { name: 'Salvar item' })).not.toBeInTheDocument()
  })

  it('item inexistente mostra erro com opção de tentar de novo', async () => {
    setup()
    server.use(http.get(`${API}/api/admin/items/99`, () => HttpResponse.json({ detail: 'Item não encontrado.' }, { status: 404 })))
    renderApp(ui, { route: '/admin/items/99' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Item não encontrado.')
  })
})
