import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { DiningTable } from '../../api/types'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import TablesPage from './TablesPage'

const mesas: DiningTable[] = [
  { id: 1, name: 'Mesa 1', displayOrder: 1, active: true },
  { id: 2, name: 'Balcão', displayOrder: 2, active: false },
]

const serve = (data = mesas) => {
  signIn()
  server.use(http.get(`${API}/api/admin/mesas`, () => HttpResponse.json(data)))
}

describe('TablesPage (Salão → Mesas)', () => {
  it('lista as mesas e indica as desativadas', async () => {
    serve()
    renderApp(<TablesPage />)
    const list = await screen.findByRole('list', { name: 'Mesas' })
    expect(within(list).getByText('Mesa 1')).toBeInTheDocument()
    expect(within(list).getByText(/Desativada/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Balcão ativa' })).toHaveAttribute('aria-checked', 'false')
  })

  it('cria mesas numeradas em lote', async () => {
    serve([])
    let sent: unknown
    server.use(
      http.post(`${API}/api/admin/mesas/lote`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(mesas, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<TablesPage />)
    expect(await screen.findByText(/Nenhuma mesa ainda/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Quantidade'))
    await user.type(screen.getByLabelText('Quantidade'), '12')
    expect(screen.getByText('Cria “Mesa 1” até “Mesa 12”. As que já existem são mantidas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('2 mesas criadas.')).toBeInTheDocument()
    expect(sent).toEqual({ quantity: 12, prefix: 'Mesa' })
  })

  it('quantidade fora de 1–100 desabilita o botão', async () => {
    serve()
    const user = userEvent.setup()
    renderApp(<TablesPage />)
    await screen.findByRole('list', { name: 'Mesas' })
    await user.clear(screen.getByLabelText('Quantidade'))
    await user.type(screen.getByLabelText('Quantidade'), '101')
    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled()
  })

  it('adiciona um ponto de atendimento avulso e mostra conflito', async () => {
    serve()
    server.use(http.post(`${API}/api/admin/mesas`, () => HttpResponse.json({ detail: 'Já existe uma mesa com esse nome.' }, { status: 409 })))
    const user = userEvent.setup()
    renderApp(<TablesPage />)
    await screen.findByRole('list', { name: 'Mesas' })
    await user.type(screen.getByLabelText('Outro ponto de atendimento'), 'balcão')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma mesa com esse nome.')
  })

  it('ativa/desativa pelo botão sem mudar nome e posição', async () => {
    serve()
    let sent: unknown
    server.use(
      http.put(`${API}/api/admin/mesas/2`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...mesas[1], active: true })
      }),
    )
    const user = userEvent.setup()
    renderApp(<TablesPage />)
    await user.click(await screen.findByRole('switch', { name: 'Balcão ativa' }))
    expect(await screen.findByText('Balcão ativada.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Balcão', displayOrder: 2, active: true })
  })

  it('exclui após confirmar', async () => {
    serve()
    let deleted = false
    server.use(http.delete(`${API}/api/admin/mesas/1`, () => ((deleted = true), new HttpResponse(null, { status: 204 }))))
    const user = userEvent.setup()
    renderApp(<TablesPage />)
    await user.click(await screen.findByRole('button', { name: 'Excluir Mesa 1' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Mesa excluída.')).toBeInTheDocument()
    expect(deleted).toBe(true)
  })
})
