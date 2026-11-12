import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Comanda, ComandaListItem } from '../../api/types'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import ComandasPage, { businessToday } from './ComandasPage'

const row = (over: Partial<ComandaListItem>): ComandaListItem => ({
  id: 1,
  tableName: 'Mesa 1',
  label: 'João',
  status: 'CLOSED',
  total: 30,
  itemCount: 2,
  openedBy: 'Ana',
  openedAt: '2026-11-12T22:00:00Z',
  closedBy: 'Bia',
  closedAt: '2026-11-12T23:00:00Z',
  cancelReason: null,
  ...over,
})

const detail: Comanda = {
  id: 1,
  tableId: 1,
  tableName: 'Mesa 1',
  label: 'João',
  status: 'CLOSED',
  people: 2,
  subtotal: 34,
  discount: 4,
  total: 30,
  openedBy: 'Ana',
  openedAt: '2026-11-12T22:00:00Z',
  updatedAt: '2026-11-12T23:00:00Z',
  version: 4,
  mergedInto: null,
  closedBy: 'Bia',
  closedAt: '2026-11-12T23:00:00Z',
  items: [
    {
      id: 9,
      menuItemId: 1,
      name: 'Brahma',
      unitPrice: 8.5,
      priceUnit: 'UNIT',
      quantity: 4,
      lineTotal: 34,
      note: null,
      custom: false,
      addedBy: 'Ana',
      addedAt: '2026-11-12T22:10:00Z',
    },
  ],
}

describe('Salão → Comandas (proprietário)', () => {
  it('dia do bar vira às 05:00 de São Paulo', () => {
    expect(businessToday(new Date('2026-11-12T06:30:00Z'))).toBe('2026-11-11') // 03:30 em SP
    expect(businessToday(new Date('2026-11-12T09:00:00Z'))).toBe('2026-11-12') // 06:00 em SP
  })

  it('filtra por situação e soma as contas fechadas', async () => {
    signIn()
    const seen: string[] = []
    server.use(
      http.get(`${API}/api/admin/comandas`, ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.searchParams.getAll('status').join(','))
        return HttpResponse.json(url.searchParams.get('status') === 'CLOSED' ? [row({}), row({ id: 2, total: 12.5 })] : [row({ status: 'OPEN', closedBy: null, closedAt: null })])
      }),
    )
    const user = userEvent.setup()
    renderApp(<ComandasPage />)
    expect(await screen.findByText('Aberta')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechadas' }))
    expect(await screen.findByTestId('total-fechadas')).toHaveTextContent('42,50')
    expect(seen).toEqual(expect.arrayContaining(['OPEN', 'CLOSED']))
  })

  it('abre o detalhe e reabre uma conta fechada', async () => {
    signIn()
    let reopened = false
    server.use(
      http.get(`${API}/api/admin/comandas`, () => HttpResponse.json([row({})])),
      http.get(`${API}/api/pedidos/comandas/1`, () => HttpResponse.json(detail)),
      http.post(`${API}/api/admin/comandas/1/reabrir`, () => ((reopened = true), HttpResponse.json({ ...detail, status: 'OPEN' }))),
    )
    const user = userEvent.setup()
    renderApp(<ComandasPage />)
    await user.click(await screen.findByRole('button', { name: /João · Mesa 1/ }))
    const sheet = await screen.findByRole('dialog', { name: 'João · Mesa 1' })
    expect(within(sheet).getByText('Brahma')).toBeInTheDocument()
    expect(within(sheet).getByText(/fechada às .* por Bia/)).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Reabrir' }))
    expect(await screen.findByText(/Comanda reaberta/)).toBeInTheDocument()
    expect(reopened).toBe(true)
  })

  it('cancela com motivo (pede confirmação)', async () => {
    signIn()
    let sent: unknown
    server.use(
      http.get(`${API}/api/admin/comandas`, () => HttpResponse.json([row({})])),
      http.get(`${API}/api/pedidos/comandas/1`, () => HttpResponse.json(detail)),
      http.post(`${API}/api/admin/comandas/1/cancelar`, async ({ request }) => ((sent = await request.json()), HttpResponse.json({ ...detail, status: 'CANCELED' }))),
    )
    const user = userEvent.setup()
    renderApp(<ComandasPage />)
    await user.click(await screen.findByRole('button', { name: /João · Mesa 1/ }))
    const sheet = await screen.findByRole('dialog', { name: 'João · Mesa 1' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancelar comanda' }))
    await user.type(within(sheet).getByLabelText(/Motivo/), 'mesa errada')
    await user.click(within(sheet).getByRole('button', { name: 'Confirmar cancelamento' }))
    expect(await screen.findByText('Comanda cancelada.')).toBeInTheDocument()
    expect(sent).toEqual({ reason: 'mesa errada' })
  })
})
