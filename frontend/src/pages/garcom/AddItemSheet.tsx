import { useMemo, useState } from 'react'
import { addComandaItem } from '../../api/endpoints'
import { useServiceMenu } from '../../api/queries'
import type { ServiceMenuItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Sheet'
import { Spinner } from '../../components/ui/Spinner'
import { formatBRL, normalize, parsePrice, parseWeightKg, unitSuffix } from '../../lib/format'
import { useComandaAction } from './useComandaAction'

type Mode = { kind: 'list' } | { kind: 'weight'; item: ServiceMenuItem } | { kind: 'custom' }

/** Gaveta para lançar: busca + categorias; toque num item por unidade lança 1; item por kg pede o peso; ou item avulso. */
export function AddItemSheet({ comandaId, open, onClose }: { comandaId: number; open: boolean; onClose: () => void }) {
  const menu = useServiceMenu()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [weight, setWeight] = useState('')
  const [custom, setCustom] = useState({ name: '', price: '', quantity: '1' })
  const [note, setNote] = useState('')

  const add = useComandaAction(
    comandaId,
    (input: Parameters<typeof addComandaItem>[1]) => addComandaItem(comandaId, input),
    (_c, input) => (input.menuItemId ? 'Item lançado.' : `“${input.name}” lançado.`),
  )

  const close = () => {
    setMode({ kind: 'list' })
    setQuery('')
    setWeight('')
    setNote('')
    setCustom({ name: '', price: '', quantity: '1' })
    onClose()
  }

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return (menu.data ?? [])
      .filter((c) => categoryId === null || c.id === categoryId || q)
      .map((c) => ({ ...c, items: q ? c.items.filter((i) => normalize(i.name).includes(q)) : c.items }))
      .filter((c) => c.items.length > 0)
  }, [menu.data, query, categoryId])

  const kg = parseWeightKg(weight)
  const customPrice = parsePrice(custom.price)
  const customQty = Number(custom.quantity)
  const customValid = custom.name.trim() !== '' && customPrice !== null && Number.isInteger(customQty) && customQty >= 1 && customQty <= 999

  const pick = (item: ServiceMenuItem) => {
    if (!item.available) return
    if (item.priceUnit === 'KG') {
      setMode({ kind: 'weight', item })
      return
    }
    add.mutate({ menuItemId: item.id, quantity: 1, note: note.trim() || undefined })
    setNote('')
  }

  if (mode.kind === 'weight') {
    return (
      <Sheet
        open={open}
        title={mode.item.name}
        onClose={close}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setMode({ kind: 'list' })}>
              Voltar
            </Button>
            <Button
              className="flex-1"
              disabled={kg === null}
              loading={add.isPending}
              onClick={() =>
                add.mutate(
                  { menuItemId: mode.item.id, quantity: kg as number, note: note.trim() || undefined },
                  { onSuccess: () => (setMode({ kind: 'list' }), setWeight(''), setNote('')) },
                )
              }
            >
              Lançar {kg !== null ? formatBRL(Math.round(mode.item.price * kg * 100) / 100) : ''}
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-tinta-700">{formatBRL(mode.item.price)} o quilo. Informe o peso da balança.</p>
        <Field id="peso" label="Peso (kg)" hint="Ex.: 0,350 ou 350g" error={weight && kg === null ? 'Peso inválido.' : undefined}>
          <input id="peso" inputMode="decimal" autoFocus value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0,350" className={inputClass} />
        </Field>
        <div className="mt-3">
          <Field id="obs-peso" label="Observação (opcional)">
            <input id="obs-peso" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} className={inputClass} />
          </Field>
        </div>
      </Sheet>
    )
  }

  if (mode.kind === 'custom') {
    return (
      <Sheet
        open={open}
        title="Item avulso"
        onClose={close}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setMode({ kind: 'list' })}>
              Voltar
            </Button>
            <Button
              className="flex-1"
              disabled={!customValid}
              loading={add.isPending}
              onClick={() =>
                add.mutate(
                  { name: custom.name.trim(), unitPrice: customPrice as number, quantity: customQty, note: note.trim() || undefined },
                  { onSuccess: () => (setMode({ kind: 'list' }), setCustom({ name: '', price: '', quantity: '1' }), setNote('')) },
                )
              }
            >
              Lançar {customValid ? formatBRL((customPrice as number) * customQty) : ''}
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-tinta-500">Para o que não está no cardápio (ex.: produto da mercearia).</p>
        <div className="space-y-3">
          <Field id="avulso-nome" label="Nome">
            <input id="avulso-nome" autoFocus value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} maxLength={100} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="avulso-preco" label="Preço (R$)" error={custom.price && customPrice === null ? 'Preço inválido.' : undefined}>
              <input
                id="avulso-preco"
                inputMode="decimal"
                value={custom.price}
                onChange={(e) => setCustom({ ...custom, price: e.target.value })}
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field id="avulso-qtd" label="Quantidade">
              <input
                id="avulso-qtd"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={custom.quantity}
                onChange={(e) => setCustom({ ...custom, quantity: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field id="obs-avulso" label="Observação (opcional)">
            <input id="obs-avulso" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} className={inputClass} />
          </Field>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} title="Lançar item" onClose={close}>
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 space-y-3 bg-white px-5 pb-3 pt-4">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-tinta-500" />
          <input
            type="search"
            aria-label="Buscar produto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Categorias">
          <button
            type="button"
            aria-pressed={categoryId === null}
            onClick={() => setCategoryId(null)}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm font-bold ${categoryId === null ? 'bg-brasa-600 text-white' : 'bg-brasa-50 text-tinta-700'}`}
          >
            Todas
          </button>
          {menu.data?.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={`press shrink-0 rounded-full px-4 py-2 text-sm font-bold ${categoryId === c.id ? 'bg-brasa-600 text-white' : 'bg-brasa-50 text-tinta-700'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <Field id="obs-item" label="Observação para o próximo item (opcional)">
          <input id="obs-item" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Ex.: sem cebola" className={inputClass} />
        </Field>
      </div>

      {menu.isPending && <Spinner label="Carregando cardápio…" />}
      {menu.isError && <ErrorState message={menu.error.message} onRetry={() => void menu.refetch()} />}
      {menu.data && filtered.length === 0 && <p className="py-6 text-center text-tinta-700">Nada encontrado.</p>}
      {filtered.map((c) => (
        <section key={c.id} aria-label={c.name} className="mb-4">
          <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-tinta-500">{c.name}</h3>
          <ul className="divide-y divide-brasa-100">
            {c.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.available || add.isPending}
                  onClick={() => pick(item)}
                  aria-label={item.available ? `Lançar ${item.name}` : `${item.name} (indisponível)`}
                  className="press flex min-h-14 w-full items-center gap-3 py-2 text-left disabled:cursor-not-allowed"
                >
                  <span className={`min-w-0 flex-1 font-bold ${item.available ? 'text-tinta-900' : 'text-tinta-500'}`}>
                    {item.name}
                    {!item.available && <span className="ml-2 rounded-full bg-tinta-300/40 px-2 py-0.5 text-xs font-bold text-tinta-700">Indisponível</span>}
                  </span>
                  <span className={`shrink-0 font-extrabold ${item.available ? '' : 'text-tinta-500'}`}>
                    {formatBRL(item.price)}
                    {unitSuffix(item.priceUnit)}
                  </span>
                  {item.available && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brasa-600 text-white" aria-hidden="true">
                      <Icon name={item.priceUnit === 'KG' ? 'scale' : 'plus'} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Button variant="secondary" className="mt-2 w-full gap-1.5" onClick={() => setMode({ kind: 'custom' })}>
        <Icon name="pencil" />
        Item avulso (fora do cardápio)
      </Button>
    </Sheet>
  )
}
