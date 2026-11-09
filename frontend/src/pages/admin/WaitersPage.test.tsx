import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Waiter } from '../../api/types'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import WaitersPage from './WaitersPage'

const garcons: Waiter[] = [
  { id: 7, name: 'João', username: 'joao', active: true },
  { id: 8, name: 'Bia', username: 'bia', active: false },
]

const serve = (data = garcons) => {
  signIn()
  server.use(http.get(`${API}/api/admin/garcons`, () => HttpResponse.json(data)))
}

describe('WaitersPage (Salão → Garçons)', () => {
  it('lista com usuário e situação, sem nunca mostrar senha', async () => {
    serve()
    renderApp(<WaitersPage />)
    const list = await screen.findByRole('list', { name: 'Garçons' })
    expect(within(list).getByText('João')).toBeInTheDocument()
    expect(within(list).getByText('Desativado', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Bia pode entrar' })).toHaveAttribute('aria-checked', 'false')
  })

  it('valida o cadastro antes de enviar (usuário com espaço, senha curta)', async () => {
    serve([])
    const user = userEvent.setup()
    renderApp(<WaitersPage />)
    await screen.findByText(/Nenhum garçom ainda/)
    const novo = screen.getByRole('region', { name: 'Novo garçom' })
    await user.type(within(novo).getByLabelText('Nome'), 'João')
    await user.type(within(novo).getByLabelText('Usuário'), 'joao silva')
    await user.type(within(novo).getByLabelText('Senha'), '123')
    await user.click(within(novo).getByRole('button', { name: 'Cadastrar' }))
    expect(await within(novo).findByText(/sem espaços/)).toBeInTheDocument()
    expect(within(novo).getByText('A senha precisa ter pelo menos 6 caracteres.')).toBeInTheDocument()
  })

  it('cadastra garçom e limpa o formulário', async () => {
    serve([])
    let sent: unknown
    server.use(
      http.post(`${API}/api/admin/garcons`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(garcons[0], { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<WaitersPage />)
    await screen.findByText(/Nenhum garçom ainda/)
    const novo = screen.getByRole('region', { name: 'Novo garçom' })
    await user.type(within(novo).getByLabelText('Nome'), ' João ')
    await user.type(within(novo).getByLabelText('Usuário'), 'joao')
    await user.type(within(novo).getByLabelText('Senha'), 'senha123')
    await user.click(within(novo).getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('João cadastrado. Entra com o usuário “joao”.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'João', username: 'joao', password: 'senha123' })
    expect(within(novo).getByLabelText('Nome')).toHaveValue('')
  })

  it('desativa pelo botão (corta o acesso) mantendo os dados', async () => {
    serve()
    let sent: unknown
    server.use(
      http.put(`${API}/api/admin/garcons/7`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...garcons[0], active: false })
      }),
    )
    const user = userEvent.setup()
    renderApp(<WaitersPage />)
    await user.click(await screen.findByRole('switch', { name: 'João pode entrar' }))
    expect(await screen.findByText('João desativado: não entra mais.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'João', username: 'joao', active: false })
  })

  it('edita; senha vazia não é enviada (mantém a atual)', async () => {
    serve()
    let sent: unknown
    server.use(
      http.put(`${API}/api/admin/garcons/7`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...garcons[0], name: 'João P.' })
      }),
    )
    const user = userEvent.setup()
    renderApp(<WaitersPage />)
    await user.click(await screen.findByRole('button', { name: 'Editar João' }))
    const nome = screen.getByLabelText('Nome', { selector: '#garcom-7-nome' })
    await user.clear(nome)
    await user.type(nome, 'João P.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Garçom atualizado.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'João P.', username: 'joao', active: true })
  })
})
