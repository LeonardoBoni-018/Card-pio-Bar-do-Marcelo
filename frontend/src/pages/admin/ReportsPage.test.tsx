import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { SalesReport } from '../../api/types'
import { server } from '../../test/server'
import { API, renderApp, signIn } from '../../test/utils'
import { businessToday } from './ComandasPage'
import ReportsPage from './ReportsPage'

const report = (over: Partial<SalesReport> = {}): SalesReport => ({
  from: '2026-11-10',
  to: '2026-11-11',
  closedCount: 3,
  gross: 96,
  discounts: 4,
  total: 92,
  averageTicket: 30.67,
  canceledCount: 1,
  canceledValue: 17,
  byDay: [
    { date: '2026-11-10', count: 2, total: 75 },
    { date: '2026-11-11', count: 1, total: 17 },
  ],
  byWaiter: [
    { name: 'João', count: 2, total: 57 },
    { name: 'Ana', count: 1, total: 35 },
  ],
  byTable: [{ name: 'Mesa 2', count: 2, total: 52 }],
  topItems: [
    { name: 'Brahma', priceUnit: 'UNIT', quantity: 6, total: 51 },
    { name: 'Panceta', priceUnit: 'KG', quantity: 0.5, total: 35 },
  ],
  customItems: [{ name: 'Gelo', priceUnit: 'UNIT', quantity: 2, total: 10 }],
  ...over,
})

describe('Salão → Relatórios', () => {
  it('mostra indicadores, dias, garçons, mesas, mais vendidos e avulsos', async () => {
    signIn()
    const seen: string[] = []
    server.use(
      http.get(`${API}/api/admin/relatorios`, ({ request }) => {
        const u = new URL(request.url)
        seen.push(`${u.searchParams.get('de')}..${u.searchParams.get('ate')}`)
        return HttpResponse.json(report())
      }),
    )
    renderApp(<ReportsPage />)
    expect(await screen.findByText(/R\$\s?92,00/)).toBeInTheDocument()
    expect(screen.getByText('Ticket médio').nextSibling).toHaveTextContent('30,67')
    expect(within(screen.getByRole('region', { name: 'Vendas por dia' })).getAllByRole('listitem')).toHaveLength(2)
    expect(within(screen.getByRole('region', { name: 'Por garçom (quem fechou)' })).getByText('João')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Mais vendidos' })).getByText('0,500 kg')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Itens avulsos' })).getByText('Gelo')).toBeInTheDocument()
    const today = businessToday()
    expect(seen[0]).toBe(`${today}..${today}`)
  })

  it('troca de período pelos atalhos e bloqueia início depois do fim', async () => {
    signIn()
    const seen: string[] = []
    server.use(http.get(`${API}/api/admin/relatorios`, ({ request }) => (seen.push(new URL(request.url).search), HttpResponse.json(report()))))
    const user = userEvent.setup()
    renderApp(<ReportsPage />)
    await screen.findByText(/R\$\s?92,00/)
    await user.click(screen.getByRole('button', { name: '7 dias' }))
    expect(screen.getByRole('button', { name: '7 dias' })).toHaveAttribute('aria-pressed', 'true')
    await screen.findByText(/R\$\s?92,00/)
    expect(seen.length).toBeGreaterThanOrEqual(2)
  })

  it('sem vendas: botão da planilha desabilitado', async () => {
    signIn()
    server.use(
      http.get(`${API}/api/admin/relatorios`, () =>
        HttpResponse.json(report({ closedCount: 0, total: 0, gross: 0, discounts: 0, averageTicket: 0, byDay: [], byWaiter: [], byTable: [], topItems: [], customItems: [] })),
      ),
    )
    renderApp(<ReportsPage />)
    expect(await screen.findByRole('button', { name: /Baixar planilha/ })).toBeDisabled()
    expect(screen.getAllByText('Nenhuma conta fechada no período.')).toHaveLength(2)
  })

  it('baixa a planilha do período', async () => {
    signIn()
    let asked = ''
    server.use(
      http.get(`${API}/api/admin/relatorios`, () => HttpResponse.json(report())),
      http.get(
        `${API}/api/admin/relatorios/planilha`,
        ({ request }) => ((asked = new URL(request.url).search), new HttpResponse('a;b', { headers: { 'Content-Type': 'text/csv' } })),
      ),
    )
    const create = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp(<ReportsPage />)
    await user.click(await screen.findByRole('button', { name: /Baixar planilha/ }))
    await vi.waitFor(() => expect(click).toHaveBeenCalled())
    expect(asked).toContain('de=')
    expect(create).toHaveBeenCalled()
    click.mockRestore()
  })
})
