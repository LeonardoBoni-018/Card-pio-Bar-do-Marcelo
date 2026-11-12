import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { mergeComanda, moveComanda, removeComandaItem, updateComanda, updateComandaItem } from '../../api/endpoints'
import { useComanda, useServiceTables } from '../../api/queries'
import type { Comanda, ComandaItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass } from '../../components/ui/Layout'
import { Sheet } from '../../components/ui/Sheet'
import { Spinner } from '../../components/ui/Spinner'
import { formatBRL, formatQuantity, parseWeightKg } from '../../lib/format'
import { AddItemSheet } from './AddItemSheet'
import { useComandaAction } from './useComandaAction'

type Panel = null | 'add' | 'edit' | 'move' | 'merge' | { item: ComandaItem }

const STATUS_TEXT: Record<Exclude<Comanda['status'], 'OPEN'>, string> = {
  CLOSED: 'Esta comanda já foi fechada.',
  CANCELED: 'Esta comanda foi cancelada.',
  MERGED: 'Esta comanda foi juntada em outra.',
}

/** Editar um item: quantidade (ou peso), observação e remover. */
function ItemSheet({ comanda, item, onClose }: { comanda: Comanda; item: ComandaItem; onClose: () => void }) {
  const kg = item.priceUnit === 'KG'
  const [qty, setQty] = useState(kg ? String(item.quantity).replace('.', ',') : String(item.quantity))
  const [note, setNote] = useState(item.note ?? '')
  const parsed = kg ? parseWeightKg(qty) : Number.isInteger(Number(qty)) && Number(qty) >= 1 && Number(qty) <= 999 ? Number(qty) : null
  const save = useComandaAction(
    comanda.id,
    () => updateComandaItem(comanda.id, item.id, parsed as number, note.trim() || null),
    () => 'Item atualizado.',
  )
  const remove = useComandaAction(
    comanda.id,
    () => removeComandaItem(comanda.id, item.id),
    () => `“${item.name}” removido.`,
  )

  return (
    <Sheet
      open
      title={item.name}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" className="gap-1.5 text-brasa-700" loading={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: onClose })}>
            <Icon name="trash" />
            Remover
          </Button>
          <Button className="flex-1" disabled={parsed === null} loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: onClose })}>
            Salvar
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-tinta-500">
        {formatBRL(item.unitPrice)}
        {kg ? ' o quilo' : ' cada'} · lançado por {item.addedBy}
        {item.custom ? ' · avulso' : ''}
      </p>
      <div className="space-y-3">
        <Field id="item-qtd" label={kg ? 'Peso (kg)' : 'Quantidade'} error={qty && parsed === null ? (kg ? 'Peso inválido.' : 'Use um número inteiro de 1 a 999.') : undefined}>
          <input id="item-qtd" inputMode={kg ? 'decimal' : 'numeric'} value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
        </Field>
        <Field id="item-obs" label="Observação">
          <input id="item-obs" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Ex.: sem cebola" className={inputClass} />
        </Field>
      </div>
    </Sheet>
  )
}

function EditSheet({ comanda, onClose }: { comanda: Comanda; onClose: () => void }) {
  const [label, setLabel] = useState(comanda.label ?? '')
  const [people, setPeople] = useState(comanda.people ? String(comanda.people) : '')
  const save = useComandaAction(
    comanda.id,
    () => updateComanda(comanda.id, label.trim() || undefined, people ? Number(people) : undefined),
    () => 'Comanda atualizada.',
  )
  return (
    <Sheet
      open
      title="Editar comanda"
      onClose={onClose}
      footer={
        <Button className="w-full" loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: onClose })}>
          Salvar
        </Button>
      }
    >
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field id="editar-identificacao" label="Identificação">
          <input id="editar-identificacao" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className={inputClass} />
        </Field>
        <Field id="editar-pessoas" label="Pessoas">
          <input id="editar-pessoas" type="number" inputMode="numeric" min={1} max={99} value={people} onChange={(e) => setPeople(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Sheet>
  )
}

function MoveSheet({ comanda, onClose }: { comanda: Comanda; onClose: () => void }) {
  const tables = useServiceTables()
  const move = useComandaAction(
    comanda.id,
    (tableId: number) => moveComanda(comanda.id, tableId),
    (c) => `Comanda movida para ${c.tableName}.`,
  )
  return (
    <Sheet open title="Mover para outra mesa" onClose={onClose}>
      {tables.isPending && <Spinner label="Carregando mesas…" />}
      <ul className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
        {tables.data
          ?.filter((t) => t.active && t.id !== comanda.tableId)
          .map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={move.isPending}
                onClick={() => move.mutate(t.id, { onSuccess: onClose })}
                className="press min-h-14 w-full rounded-xl bg-brasa-50 px-3 py-2 font-extrabold text-tinta-900 ring-1 ring-brasa-100 hover:bg-sol-100"
              >
                {t.name}
              </button>
            </li>
          ))}
      </ul>
    </Sheet>
  )
}

function MergeSheet({ comanda, onClose }: { comanda: Comanda; onClose: () => void }) {
  const tables = useServiceTables()
  const merge = useComandaAction(
    comanda.id,
    (fromId: number) => mergeComanda(comanda.id, fromId),
    () => 'Comandas juntadas.',
  )
  const others = (tables.data ?? []).flatMap((t) => t.comandas.filter((c) => c.id !== comanda.id).map((c) => ({ ...c, tableName: t.name })))
  return (
    <Sheet open title="Juntar outra comanda nesta" onClose={onClose}>
      <p className="mb-3 text-sm text-tinta-500">Os itens da comanda escolhida passam para esta, que fica com a conta toda.</p>
      {tables.isPending && <Spinner label="Carregando comandas…" />}
      {tables.data && others.length === 0 && <p className="py-4 text-center text-tinta-700">Não há outras comandas abertas.</p>}
      <ul className="space-y-2">
        {others.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={merge.isPending}
              onClick={() => merge.mutate(c.id, { onSuccess: onClose })}
              className="press flex min-h-14 w-full items-center gap-3 rounded-xl bg-brasa-50 px-3 py-2 text-left ring-1 ring-brasa-100 hover:bg-sol-100"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{c.label ?? `Comanda ${c.id}`}</span>
                <span className="block text-sm text-tinta-500">{c.tableName}</span>
              </span>
              <span className="font-extrabold">{formatBRL(c.total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** Comanda no celular: itens, +/−, total fixo embaixo e ações (lançar, editar, mover, juntar). */
export default function ComandaPage() {
  const id = Number(useParams().id)
  const comanda = useComanda(id)
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel>(null)
  const step = useComandaAction(id, ({ item, quantity }: { item: ComandaItem; quantity: number }) =>
    quantity < 1 ? removeComandaItem(id, item.id) : updateComandaItem(id, item.id, quantity, item.note),
  )

  if (comanda.isPending) return <Spinner label="Abrindo comanda…" />
  if (comanda.isError) return <ErrorState message={comanda.error.message} onRetry={() => void comanda.refetch()} />
  const c = comanda.data
  const open = c.status === 'OPEN'
  const close = () => setPanel(null)

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-start gap-2">
        <Link
          to={`/garcom/mesa/${c.tableId}`}
          aria-label={`Voltar para ${c.tableName}`}
          className="press flex size-11 shrink-0 items-center justify-center rounded-full text-tinta-700 hover:bg-sol-100"
        >
          <Icon name="up" className="size-6 -rotate-90" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold">{c.label ?? `Comanda ${c.id}`}</h1>
          <p className="text-sm text-tinta-500">
            {c.tableName}
            {c.people ? ` · ${c.people} ${c.people === 1 ? 'pessoa' : 'pessoas'}` : ''} · aberta por {c.openedBy}
          </p>
        </div>
      </div>

      {!open && (
        <div role="status" className="rounded-xl bg-sol-100 px-3 py-2 font-semibold text-tinta-900 ring-1 ring-sol-500">
          {STATUS_TEXT[c.status as Exclude<Comanda['status'], 'OPEN'>]}{' '}
          {c.status === 'MERGED' && c.mergedInto && (
            <button type="button" className="font-extrabold text-brasa-700 underline" onClick={() => navigate(`/garcom/comanda/${c.mergedInto}`)}>
              Abrir a comanda que ficou com os itens
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Ações da comanda">
          {(
            [
              ['edit', 'pencil', 'Editar'],
              ['move', 'store', 'Mover de mesa'],
              ['merge', 'copy', 'Juntar comanda'],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(key)}
              className="press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-tinta-700 shadow-sm ring-1 ring-brasa-100 hover:bg-sol-100"
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </div>
      )}

      {c.items.length === 0 ? (
        <p className={`${cardClass} py-8 text-center text-tinta-700`}>
          <Icon name="list" className="mx-auto mb-2 size-8 text-brasa-700" />
          {open ? 'Nenhum item ainda. Toque em “Lançar item”.' : 'Sem itens.'}
        </p>
      ) : (
        <ul aria-label="Itens da comanda" className="divide-y divide-brasa-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brasa-100">
          {c.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3">
              <button
                type="button"
                disabled={!open}
                onClick={() => setPanel({ item })}
                aria-label={`Editar ${item.name}`}
                className="press min-w-0 basis-full rounded-lg text-left disabled:cursor-default min-[400px]:basis-0 min-[400px]:flex-1"
              >
                <span className="block font-extrabold leading-tight">
                  {item.name}
                  {item.custom && <span className="ml-1.5 rounded-full bg-sol-100 px-1.5 py-0.5 text-xs font-bold text-tinta-700">avulso</span>}
                </span>
                {item.note && <span className="block text-sm font-semibold text-brasa-700">{item.note}</span>}
                <span className="block text-xs text-tinta-500">
                  {formatQuantity(item.quantity, item.priceUnit)} · {formatBRL(item.unitPrice)}
                  {item.priceUnit === 'KG' ? '/kg' : ''} · {item.addedBy}
                </span>
              </button>
              {open && item.priceUnit === 'UNIT' && (
                <div className="mr-auto flex shrink-0 items-center gap-1 min-[400px]:mr-0" role="group" aria-label={`Quantidade de ${item.name}`}>
                  <button
                    type="button"
                    disabled={step.isPending}
                    onClick={() => step.mutate({ item, quantity: item.quantity - 1 })}
                    aria-label={item.quantity === 1 ? `Remover ${item.name}` : `Diminuir ${item.name}`}
                    className="press flex size-11 items-center justify-center rounded-full bg-brasa-50 text-xl font-extrabold text-brasa-700"
                  >
                    {item.quantity === 1 ? <Icon name="trash" /> : '−'}
                  </button>
                  <span className="w-7 text-center font-extrabold" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={step.isPending || item.quantity >= 999}
                    onClick={() => step.mutate({ item, quantity: item.quantity + 1 })}
                    aria-label={`Aumentar ${item.name}`}
                    className="press flex size-11 items-center justify-center rounded-full bg-brasa-600 text-xl font-extrabold text-white"
                  >
                    +
                  </button>
                </div>
              )}
              <span className="ml-auto w-20 shrink-0 text-right font-extrabold min-[400px]:ml-0">{formatBRL(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brasa-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(127,15,25,0.12)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-tinta-500">Total</p>
            <p className="text-2xl font-extrabold leading-tight" data-testid="comanda-total">
              {formatBRL(c.total)}
            </p>
          </div>
          {open && (
            <Button onClick={() => setPanel('add')} className="gap-1.5">
              <Icon name="plus" />
              Lançar item
            </Button>
          )}
        </div>
      </div>

      <AddItemSheet comandaId={c.id} open={panel === 'add'} onClose={close} />
      {panel === 'edit' && <EditSheet comanda={c} onClose={close} />}
      {panel === 'move' && <MoveSheet comanda={c} onClose={close} />}
      {panel === 'merge' && <MergeSheet comanda={c} onClose={close} />}
      {panel && typeof panel === 'object' && <ItemSheet comanda={c} item={panel.item} onClose={close} />}
    </div>
  )
}
