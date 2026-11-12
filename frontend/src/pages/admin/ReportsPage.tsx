import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { downloadSalesSheet, getSalesReport } from '../../api/endpoints'
import type { ReportGroup, ReportItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass, CardTitle } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatBRL, formatQuantity } from '../../lib/format'
import { businessToday } from './ComandasPage'

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function presets(today: string) {
  return [
    { key: 'today', label: 'Hoje', de: today, ate: today },
    { key: 'yesterday', label: 'Ontem', de: addDays(today, -1), ate: addDays(today, -1) },
    { key: '7d', label: '7 dias', de: addDays(today, -6), ate: today },
    { key: 'month', label: 'Este mês', de: `${today.slice(0, 8)}01`, ate: today },
  ]
}

const dayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' })

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={cardClass}>
      <p className="text-sm font-bold text-tinta-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold leading-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-tinta-500">{hint}</p>}
    </div>
  )
}

/** Tabela simples com barra proporcional ao valor (lê bem no celular). */
function RankTable({ title, icon, rows, empty }: { title: string; icon: 'user' | 'store'; rows: ReportGroup[]; empty: string }) {
  const max = Math.max(...rows.map((r) => r.total), 0.01)
  return (
    <section aria-label={title} className={cardClass}>
      <CardTitle icon={icon}>{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="text-tinta-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between gap-3">
                <span className="min-w-0 truncate font-bold">{r.name}</span>
                <span className="shrink-0 font-extrabold">{formatBRL(r.total)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 rounded-full bg-laranja-500" style={{ width: `${(r.total / max) * 100}%` }} aria-hidden="true" />
                <span className="shrink-0 text-xs text-tinta-500">
                  {r.count} {r.count === 1 ? 'conta' : 'contas'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ItemsTable({ title, rows, empty }: { title: string; rows: ReportItem[]; empty: string }) {
  return (
    <section aria-label={title} className={cardClass}>
      <CardTitle icon="list">{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="text-tinta-500">{empty}</p>
      ) : (
        <table className="w-full text-left">
          <thead className="text-xs uppercase tracking-wide text-tinta-500">
            <tr>
              <th className="pb-2 font-bold">Produto</th>
              <th className="pb-2 text-right font-bold">Qtd.</th>
              <th className="pb-2 text-right font-bold">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brasa-100">
            {rows.slice(0, 15).map((r, i) => (
              <tr key={`${r.name}-${i}`}>
                <td className="py-2 pr-2 font-bold">{r.name}</td>
                <td className="whitespace-nowrap py-2 text-right">{formatQuantity(r.quantity, r.priceUnit).replace('×', '')}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right font-extrabold">{formatBRL(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/** Salão → Relatórios: vendas das contas fechadas no período (dia do bar vira às 05:00). Só conferência, sem nota fiscal. */
export default function ReportsPage() {
  const today = businessToday()
  const options = presets(today)
  const [range, setRange] = useState({ key: 'today', de: today, ate: today })
  const valid = range.de <= range.ate
  const report = useQuery({ queryKey: ['admin', 'report', range.de, range.ate], queryFn: () => getSalesReport(range.de, range.ate), enabled: valid, placeholderData: (p) => p })
  const toast = useToast()
  const download = useMutation({
    mutationFn: () => downloadSalesSheet(range.de, range.ate),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vendas-${range.de}${range.de === range.ate ? '' : `-a-${range.ate}`}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    onError: (e) => toast.error(e.message),
  })
  const r = report.data
  const maxDay = Math.max(...(r?.byDay.map((d) => d.total) ?? [0]), 0.01)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={range.key === o.key}
            onClick={() => setRange({ key: o.key, de: o.de, ate: o.ate })}
            className={`press min-h-11 rounded-full px-4 text-sm font-bold ${range.key === o.key ? 'bg-brasa-600 text-white' : 'bg-white text-tinta-700 ring-1 ring-brasa-100'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Field id="relatorio-de" label="De" error={!valid ? 'Início depois do fim.' : undefined}>
          <input
            id="relatorio-de"
            type="date"
            value={range.de}
            max={today}
            onChange={(e) => e.target.value && setRange({ ...range, key: 'custom', de: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field id="relatorio-ate" label="Até">
          <input
            id="relatorio-ate"
            type="date"
            value={range.ate}
            max={today}
            onChange={(e) => e.target.value && setRange({ ...range, key: 'custom', ate: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {report.isPending && valid && <Spinner label="Calculando…" />}
      {report.isError && <ErrorState message={report.error.message} onRetry={() => void report.refetch()} />}
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total vendido" value={formatBRL(r.total)} hint={r.discounts > 0 ? `${formatBRL(r.discounts)} em descontos` : undefined} />
            <Kpi label="Contas fechadas" value={String(r.closedCount)} />
            <Kpi label="Ticket médio" value={formatBRL(r.averageTicket)} hint="por conta" />
            <Kpi label="Canceladas" value={String(r.canceledCount)} hint={r.canceledCount > 0 ? formatBRL(r.canceledValue) : undefined} />
          </div>

          {r.byDay.length > 1 && (
            <section aria-label="Vendas por dia" className={cardClass}>
              <CardTitle icon="clock">Vendas por dia</CardTitle>
              <ul className="space-y-2">
                {r.byDay.map((d) => (
                  <li key={d.date} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
                    <span className="font-bold capitalize text-tinta-700">{dayLabel.format(new Date(`${d.date}T12:00:00Z`))}</span>
                    <span className="h-3 rounded-full bg-brasa-50">
                      <span className="block h-3 rounded-full bg-brasa-600" style={{ width: `${(d.total / maxDay) * 100}%` }} aria-hidden="true" />
                    </span>
                    <span className="w-24 text-right font-extrabold">{formatBRL(d.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <RankTable title="Por garçom (quem fechou)" icon="user" rows={r.byWaiter} empty="Nenhuma conta fechada no período." />
            <RankTable title="Por mesa" icon="store" rows={r.byTable} empty="Nenhuma conta fechada no período." />
            <ItemsTable title="Mais vendidos" rows={r.topItems} empty="Nenhum item do cardápio vendido." />
            <ItemsTable title="Itens avulsos" rows={r.customItems} empty="Nenhum item avulso no período." />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" className="gap-1.5" loading={download.isPending} disabled={r.closedCount === 0} onClick={() => download.mutate()}>
              <Icon name="printer" />
              Baixar planilha (Excel)
            </Button>
            <p className="text-sm text-tinta-500">Só contas fechadas. Valores para conferência, sem valor fiscal.</p>
          </div>
        </>
      )}
    </div>
  )
}
