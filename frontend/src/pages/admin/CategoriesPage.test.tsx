import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { categories } from '../../test/fixtures'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import CategoriesPage from './CategoriesPage'

const serve = (data = categories) => {
  signIn()
  server.use(http.get(`${API}/api/admin/categories`, () => HttpResponse.json(data)))
}

describe('CategoriesPage', () => {
  it('lista as categorias com a posição', async () => {
    serve()
    renderApp(<CategoriesPage />)
    expect(await screen.findByText('Cervejas')).toBeInTheDocument()
    expect(screen.getByText('Porções')).toBeInTheDocument()
    expect(screen.getByText('Posição 2')).toBeInTheDocument()
  })

  it('cria categoria no fim da lista e limpa o campo', async () => {
    serve()
    let sent: unknown
    server.use(http.post(`${API}/api/admin/categories`, async ({ request }) => ((sent = await request.json()), HttpResponse.json({ id: 3, name: 'Bebidas', displayOrder: 3 }, { status: 201 }))))
    const user = userEvent.setup()
    renderApp(<CategoriesPage />)
    await screen.findByText('Cervejas')

    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
    await user.type(screen.getByLabelText('Nova categoria'), ' Bebidas ')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByText('Categoria “Bebidas” criada.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Bebidas', displayOrder: 3 })
    expect(screen.getByLabelText('Nova categoria')).toHaveValue('')
  })

  it('mostra conflito de nome repetido', async () => {
    serve()
    server.use(http.post(`${API}/api/admin/categories`, () => HttpResponse.json({ detail: 'Já existe uma categoria com esse nome.' }, { status: 409 })))
    const user = userEvent.setup()
    renderApp(<CategoriesPage />)
    await screen.findByText('Cervejas')

    await user.type(screen.getByLabelText('Nova categoria'), 'cervejas')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome.')
  })

  it('edita nome e posição', async () => {
    serve()
    let sent: unknown
    server.use(http.put(`${API}/api/admin/categories/1`, async ({ request }) => ((sent = await request.json()), HttpResponse.json({ id: 1, name: 'Cervejas Geladas', displayOrder: 5 }))))
    const user = userEvent.setup()
    renderApp(<CategoriesPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar Cervejas' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Cervejas Geladas')
    await user.clear(screen.getByLabelText('Posição'))
    await user.type(screen.getByLabelText('Posição'), '5')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Categoria atualizada.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Cervejas Geladas', displayOrder: 5 })
  })

  it('cancelar a edição descarta as mudanças', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<CategoriesPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar Cervejas' }))
    await user.type(screen.getByLabelText('Nome'), ' XYZ')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Cervejas')).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/XYZ/)).not.toBeInTheDocument()
  })

  it('exclui após confirmar; categoria com itens mostra o motivo', async () => {
    serve()
    server.use(
      http.delete(`${API}/api/admin/categories/1`, () => HttpResponse.json({ detail: 'A categoria possui itens; mova ou exclua os itens antes.' }, { status: 409 })),
      http.delete(`${API}/api/admin/categories/2`, () => new HttpResponse(null, { status: 204 })),
    )
    const user = userEvent.setup()
    renderApp(<CategoriesPage />)

    await user.click(await screen.findByRole('button', { name: 'Excluir Cervejas' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText(/possui itens/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Excluir Porções' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Categoria excluída.')).toBeInTheDocument()
  })

  it('sem categorias orienta a criar a primeira', async () => {
    serve([])
    renderApp(<CategoriesPage />)
    expect(await screen.findByText(/Nenhuma categoria ainda/)).toBeInTheDocument()
  })

  it('erro ao carregar permite tentar de novo', async () => {
    signIn()
    server.use(http.get(`${API}/api/admin/categories`, () => HttpResponse.error()))
    renderApp(<CategoriesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/conectar ao servidor/)
  })
})
