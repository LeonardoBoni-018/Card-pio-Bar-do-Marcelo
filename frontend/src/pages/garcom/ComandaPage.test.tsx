import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import type { Comanda, ServiceMenuCategory, TableOverview } from '../../api/types'
import { session } from '../../auth/session'
import { server } from '../../test/server'
import { API, renderApp, signInWaiter } from '../../test/utils'
import GarcomApp from './GarcomApp'

const base: Comanda = {
  id: 5,
  tableId: 1,
  tableName: 'Mesa 1',
  label: 'João',
  status: 'OPEN',
  people: 2,
  subtotal: 17,
  discount: 0,
  total: 17,
  openedBy: 'Ana',
  openedAt: '2026-11-12T20:00:00Z',
  updatedAt: '2026-11-12T20:00:00Z',
  version: 1,
  mergedInto: null,
  items: [
    {
      id: 11,
      menuItemId: 3,
      name: 'Brahma 600ml',
      unitPrice: 8.5,
      priceUnit: 'UNIT',
      quantity: 2,
      lineTotal: 17,
      note: null,
      custom: false,
      addedBy: 'Ana',
      addedAt: '2026-11-12T20:01:00Z',
    },
  ],
}

const menu: ServiceMenuCategory[] = [
  {
    id: 1,
    name: 'Cervejas',
    items: [
      { id: 3, name: 'Brahma 600ml', price: 8.5, priceUnit: 'UNIT', available: true },
      { id: 4, name: 'Heineken', price: 13, priceUnit: 'UNIT', available: false },
    ],
  },
  { id: 2, name: 'Porções', items: [{ id: 9, name: 'Panceta', price: 70, priceUnit: 'KG', available: true }] },
]

const tables: TableOverview[] = [
  {
    id: 1,
    name: 'Mesa 1',
    displayOrder: 1,
    active: true,
    openTotal: 17,
    comandas: [{ id: 5, label: 'João', total: 17, itemCount: 1, openedBy: 'Ana', openedAt: base.openedAt, version: 1 }],
  },
  {
    id: 2,
    name: 'Mesa 2',
    displayOrder: 2,
    active: true,
    openTotal: 30,
    comandas: [{ id: 6, label: 'Maria', total: 30, itemCount: 2, openedBy: 'Ana', openedAt: base.openedAt, version: 1 }],
  },
]

function render(route = '/garcom/comanda/5') {
  return renderApp(
    <Routes>
      <Route path="/garcom/*" element={<GarcomApp />} />
    </Routes>,
    { route },
  )
}

const json =
  <T,>(fn: (body: T) => Comanda) =>
  async ({ request }: { request: Request }) =>
    HttpResponse.json(fn((await request.json()) as T))

describe('Comanda (garçom)', () => {
  beforeEach(() => {
    signInWaiter('Ana')
    server.use(
      http.get(`${API}/api/pedidos/comandas/5`, () => HttpResponse.json(base)),
      http.get(`${API}/api/pedidos/cardapio`, () => HttpResponse.json(menu)),
      http.get(`${API}/api/pedidos/mesas`, () => HttpResponse.json(tables)),
    )
  })
  afterEach(() => session.clear())

  it('mostra itens, quem lançou e o total', async () => {
    render()
    expect(await screen.findByRole('heading', { name: 'João' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Itens da comanda' })
    expect(within(list).getByText('Brahma 600ml')).toBeInTheDocument()
    expect(within(list).getByText(/2× · R\$\s?8,50 · Ana/)).toBeInTheDocument()
    expect(screen.getByTestId('comanda-total')).toHaveTextContent('17,00')
  })

  it('+ aumenta a quantidade e o total vem recalculado do servidor', async () => {
    let sent: unknown
    server.use(
      http.patch(
        `${API}/api/pedidos/comandas/5/itens/11`,
        json((body: { quantity: number }) => {
          sent = body
          return { ...base, total: 25.5, items: [{ ...base.items[0], quantity: 3, lineTotal: 25.5 }] }
        }),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Aumentar Brahma 600ml' }))
    await screen.findByText(/3× ·/)
    expect(screen.getByTestId('comanda-total')).toHaveTextContent('25,50')
    expect(sent).toEqual({ quantity: 3 })
  })

  it('lança item do cardápio pela gaveta; indisponível aparece mas não pode ser tocado', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas/5/itens`,
        json((body) => {
          sent = body
          return { ...base, total: 25.5 }
        }),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Lançar item' }))
    const sheet = await screen.findByRole('dialog', { name: 'Lançar item' })
    expect(within(sheet).getByRole('button', { name: 'Heineken (indisponível)' })).toBeDisabled()
    await user.type(within(sheet).getByLabelText(/Observação/), 'bem gelada')
    await user.click(within(sheet).getByRole('button', { name: 'Lançar Brahma 600ml' }))
    expect(await screen.findByText('Item lançado.')).toBeInTheDocument()
    expect(sent).toEqual({ menuItemId: 3, quantity: 1, note: 'bem gelada' })
  })

  it('busca filtra por nome sem acento; item por kg pede o peso e mostra o valor', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas/5/itens`,
        json((body) => ((sent = body), base)),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Lançar item' }))
    const sheet = await screen.findByRole('dialog', { name: 'Lançar item' })
    await user.type(within(sheet).getByRole('searchbox', { name: 'Buscar produto' }), 'PANCETA')
    expect(within(sheet).queryByText('Brahma 600ml')).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Lançar Panceta' }))
    const weight = await screen.findByRole('dialog', { name: 'Panceta' })
    await user.type(within(weight).getByLabelText('Peso (kg)'), '0,355')
    await user.click(within(weight).getByRole('button', { name: /Lançar R\$\s?24,85/ }))
    await screen.findByText('Item lançado.')
    expect(sent).toEqual({ menuItemId: 9, quantity: 0.355 })
  })

  it('lança item avulso com nome e preço digitados', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas/5/itens`,
        json((body) => ((sent = body), base)),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Lançar item' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Lançar item' })).getByRole('button', { name: /Item avulso/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Item avulso' })
    await user.type(within(sheet).getByLabelText('Nome'), 'Carvão 3kg')
    await user.type(within(sheet).getByLabelText('Preço (R$)'), '25')
    await user.clear(within(sheet).getByLabelText('Quantidade'))
    await user.type(within(sheet).getByLabelText('Quantidade'), '2')
    await user.click(within(sheet).getByRole('button', { name: /Lançar R\$\s?50,00/ }))
    expect(await screen.findByText('“Carvão 3kg” lançado.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Carvão 3kg', unitPrice: 25, quantity: 2 })
  })

  it('move para outra mesa', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas/5/mover`,
        json((body) => ((sent = body), { ...base, tableId: 2, tableName: 'Mesa 2' })),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Mover de mesa' }))
    const sheet = await screen.findByRole('dialog', { name: 'Mover para outra mesa' })
    expect(within(sheet).queryByRole('button', { name: 'Mesa 1' })).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Mesa 2' }))
    expect(await screen.findByText('Comanda movida para Mesa 2.')).toBeInTheDocument()
    expect(sent).toEqual({ tableId: 2 })
  })

  it('junta outra comanda nesta', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas/5/juntar`,
        json((body) => ((sent = body), { ...base, total: 47 })),
      ),
    )
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Juntar comanda' }))
    const sheet = await screen.findByRole('dialog', { name: 'Juntar outra comanda nesta' })
    await user.click(within(sheet).getByRole('button', { name: /Maria/ }))
    expect(await screen.findByText('Comandas juntadas.')).toBeInTheDocument()
    expect(sent).toEqual({ fromComandaId: 6 })
  })

  it('comanda juntada fica só leitura e aponta para a outra', async () => {
    server.use(http.get(`${API}/api/pedidos/comandas/5`, () => HttpResponse.json({ ...base, status: 'MERGED', mergedInto: 6, items: [] })))
    render()
    expect(await screen.findByText(/foi juntada em outra/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lançar item' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Abrir a comanda que ficou/ })).toBeInTheDocument()
  })

  it('erro do servidor (ex.: comanda fechada por outra pessoa) aparece como aviso', async () => {
    server.use(http.patch(`${API}/api/pedidos/comandas/5/itens/11`, () => HttpResponse.json({ detail: 'Esta comanda já foi fechada.' }, { status: 409 })))
    const user = userEvent.setup()
    render()
    await user.click(await screen.findByRole('button', { name: 'Aumentar Brahma 600ml' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta comanda já foi fechada.')
  })

  it('mesa: lista as comandas e abre uma nova', async () => {
    let sent: unknown
    server.use(
      http.post(
        `${API}/api/pedidos/comandas`,
        json((body) => ((sent = body), { ...base, id: 5 })),
      ),
    )
    const user = userEvent.setup()
    render('/garcom/mesa/1')
    expect(await screen.findByRole('heading', { name: 'Mesa 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /João/ })).toHaveAttribute('href', '/garcom/comanda/5')
    await user.type(screen.getByLabelText('Identificação (opcional)'), 'Casal')
    await user.type(screen.getByLabelText('Pessoas'), '2')
    await user.click(screen.getByRole('button', { name: 'Abrir comanda' }))
    expect(await screen.findByRole('list', { name: 'Itens da comanda' })).toBeInTheDocument()
    expect(sent).toEqual({ tableId: 1, label: 'Casal', people: 2 })
  })
})
