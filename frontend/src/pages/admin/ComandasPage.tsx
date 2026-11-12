import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { cancelComanda, getComanda, reopenComanda } from '../../api/endpoints'
import { keys, useAdminComandas } from '../../api/queries'
import type { ComandaListItem, ComandaStatus } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass } from '../../components/ui/Layout'
import { Sheet } from '../../components/ui/Sheet'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatBRL, formatQuantity } from '../../lib/format'

const FILTERS: { key: string; label: string; status?: ComandaStatus[] }[] = [
  { key: 'open', label: 'Abertas', status: ['OPEN'] },
  { key: 'closed', label: 'Fechadas', status: ['CLOSED'] },
  { key: 'canceled', label: 'Canceladas', status: ['CANCELED'] },
  { key: 'all', label: 'Todas' },
]

const STATUS_LABEL: Record<ComandaStatus, string> = { OPEN: 'Aberta', CLOSED: 'Fechada', CANCELED: 'Cancelada', MERGED: 'Juntada' }
const STATUS_CLASS: Record<ComandaStatus, string> = {
  OPEN: 'bg-sol-300 text-tinta-900',
  CLOSED: 'bg-brasa-600 text-white',
  CANCELED: 'bg-tinta-300 text-tinta-900',
  MERGED: 'bg-brasa-50 text-tinta-700',
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "Hoje" no bar: antes das 05:00 ainda é o dia anterior (igual à API). */
export function businessToday(now = new Date()): string {
  const shifted = new Date(now.getTime() - 5 * 3600_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(shifted)
}

function DetailSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const comanda = useQuery({ queryKey: keys.comanda(id), queryFn: () => getComanda(id) })
  const [reason, setReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()
  const done = (message: string) => () => {
    toast.success(message)
    void queryClient.invalidateQueries({ queryKey: keys.adminComandas })
    void queryClient.invalidateQueries({ queryKey: keys.comanda(id) })
    onClose()
  }
  const reopen = useMutation({
    mutationFn: () => reopenComanda(id),
    onSuccess: done('Comanda reaberta: os garçons já podem lançar de novo.'),
    onError: (e) => toast.error(e.message),
  })
  const cancel = useMutation({ mutationFn: () => cancelComanda(id, reason.trim() || undefined), onSuccess: done('Comanda cancelada.'), onError: (e) => toast.error(e.message) })
  const c = comanda.data

  return (
    <Sheet
      open
      title={c ? `${c.label ?? `Comanda ${c.id}`} · ${c.tableName}` : 'Comanda'}
      onClose={onClose}
      footer={
        c && (c.status === 'OPEN' || c.status === 'CLOSED') ? (
          confirmCancel ? (
            <div className="space-y-3">
              <Field id="cancelar-motivo" label="Motivo do cancelamento (opcional)">
                <input id="cancelar-motivo" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} className={inputClass} />
              </Field>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                  Voltar
                </Button>
                <Button variant="danger" className="flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                  Confirmar cancelamento
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" className="gap-1.5 text-brasa-700" onClick={() => setConfirmCancel(true)}>
                <Icon name="close" />
                Cancelar comanda
              </Button>
              {c.status === 'CLOSED' && (
                <Button className="flex-1 gap-1.5" loading={reopen.isPending} onClick={() => reopen.mutate()}>
                  Reabrir
                </Button>
              )}
            </div>
          )
        ) : undefined
      }
    >
      {comanda.isPending && <Spinner label="Carregando…" />}
      {comanda.isError && <ErrorState message={comanda.error.message} onRetry={() => void comanda.refetch()} />}
      {c && (
        <div className="space-y-3">
          <p className="text-sm text-tinta-500">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            Aberta às {time.format(new Date(c.openedAt))} por {c.openedBy}
            {c.closedBy && c.closedAt && ` · fechada às ${time.format(new Date(c.closedAt))} por ${c.closedBy}`}
            {c.canceledBy && ` · cancelada por ${c.canceledBy}`}
            {c.cancelReason && ` (${c.cancelReason})`}
            {c.reopenedCount ? ` · reaberta ${c.reopenedCount}×` : ''}
          </p>
          <ul className="divide-y divide-brasa-100">
            {c.items.map((i) => (
              <li key={i.id} className="flex gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {i.name}
                    {i.custom && <span className="ml-1.5 rounded-full bg-sol-100 px-1.5 py-0.5 text-xs font-bold text-tinta-700">avulso</span>}
                  </span>
                  <span className="block text-xs text-tinta-500">
                    {formatQuantity(i.quantity, i.priceUnit)} · {formatBRL(i.unitPrice)} · {i.addedBy}
                    {i.note ? ` · ${i.note}` : ''}
                  </span>
                </span>
                <span className="font-bold">{formatBRL(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-brasa-100 pt-2">
            {c.discount > 0 && (
              <div className="flex justify-between text-brasa-700">
                <dt>Desconto</dt>
                <dd>− {formatBRL(c.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-xl font-extrabold">
              <dt>Total</dt>
              <dd>{formatBRL(c.total)}</dd>
            </div>
          </dl>
        </div>
      )}
    </Sheet>
  )
}

/** Salão → Comandas: o proprietário acompanha o dia e corrige (reabrir, cancelar). */
export default function ComandasPage() {
  const [filter, setFilter] = useState('open')
  const [day, setDay] = useState(businessToday())
  const [selected, setSelected] = useState<number | null>(null)
  const status = FILTERS.find((f) => f.key === filter)?.status
  const list = useAdminComandas({ status, de: day, ate: day })
  const sum = (items: ComandaListItem[]) => items.filter((c) => c.status === 'CLOSED').reduce((acc, c) => acc + c.total, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Situação">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`press min-h-11 rounded-full px-4 text-sm font-bold ${filter === f.key ? 'bg-brasa-600 text-white' : 'bg-white text-tinta-700 ring-1 ring-brasa-100'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto w-44">
          <Field id="comandas-dia" label="Dia">
            <input id="comandas-dia" type="date" value={day} max={businessToday()} onChange={(e) => e.target.value && setDay(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>

      {list.isPending && <Spinner label="Carregando comandas…" />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}
      {list.data && (filter === 'closed' || filter === 'all') && list.data.some((c) => c.status === 'CLOSED') && (
        <p className={`${cardClass} flex justify-between font-extrabold`}>
          <span>Total das contas fechadas</span>
          <span data-testid="total-fechadas">{formatBRL(sum(list.data))}</span>
        </p>
      )}
      {list.data?.length === 0 && (
        <p className={`${cardClass} py-8 text-center text-tinta-700`}>
          <Icon name="list" className="mx-auto mb-2 size-8 text-brasa-700" />
          Nenhuma comanda neste filtro.
        </p>
      )}
      {list.data && list.data.length > 0 && (
        <ul aria-label="Comandas" className="divide-y divide-brasa-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brasa-100">
          {list.data.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setSelected(c.id)} className="press flex w-full items-center gap-3 p-4 text-left hover:bg-sol-100/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">
                    {c.label ?? `Comanda ${c.id}`} · {c.tableName}
                  </span>
                  <span className="block text-sm text-tinta-500">
                    <span className={`mr-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    {time.format(new Date(c.openedAt))} · {c.openedBy}
                    {c.closedBy ? ` → ${c.closedBy}` : ''} · {c.itemCount} {c.itemCount === 1 ? 'item' : 'itens'}
                  </span>
                </span>
                <span className={`font-extrabold ${c.status === 'CANCELED' ? 'text-tinta-500 line-through' : ''}`}>{formatBRL(c.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected !== null && <DetailSheet id={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
