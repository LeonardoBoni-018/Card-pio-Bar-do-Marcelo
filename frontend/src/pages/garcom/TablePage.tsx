import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { openComanda } from '../../api/endpoints'
import { keys, useServiceTables } from '../../api/queries'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass, CardTitle } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatBRL } from '../../lib/format'

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Uma mesa: as comandas abertas dela e o formulário para abrir mais uma. */
export default function TablePage() {
  const tableId = Number(useParams().tableId)
  const tables = useServiceTables()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [label, setLabel] = useState('')
  const [people, setPeople] = useState('')
  const table = tables.data?.find((t) => t.id === tableId)

  const open = useMutation({
    mutationFn: () => openComanda(tableId, label.trim() || undefined, people ? Number(people) : undefined),
    onSuccess: (comanda) => {
      queryClient.setQueryData(keys.comanda(comanda.id), comanda)
      void queryClient.invalidateQueries({ queryKey: keys.serviceTables })
      navigate(`/garcom/comanda/${comanda.id}`)
    },
    onError: (error) => toast.error(error.message),
  })

  if (tables.isPending) return <Spinner label="Carregando mesa…" />
  if (tables.isError) return <ErrorState message={tables.error.message} onRetry={() => void tables.refetch()} />
  if (!table) {
    return (
      <div className="space-y-4">
        <p className={`${cardClass} text-center`}>Mesa não encontrada ou desativada.</p>
        <Link to="/garcom" className="font-bold text-brasa-700 underline">
          Voltar às mesas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/garcom" aria-label="Voltar às mesas" className="press flex size-11 items-center justify-center rounded-full text-tinta-700 hover:bg-sol-100">
          <Icon name="up" className="size-6 -rotate-90" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">{table.name}</h1>
        {table.comandas.length > 0 && <span className="text-lg font-extrabold">{formatBRL(table.openTotal)}</span>}
      </div>

      <section aria-labelledby="titulo-abertas">
        <h2 id="titulo-abertas" className="mb-2 text-sm font-extrabold uppercase tracking-wide text-tinta-500">
          Comandas abertas
        </h2>
        {table.comandas.length === 0 ? (
          <p className={`${cardClass} text-center text-tinta-700`}>Nenhuma comanda aberta nesta mesa.</p>
        ) : (
          <ul className="space-y-2">
            {table.comandas.map((c) => (
              <li key={c.id}>
                <Link to={`/garcom/comanda/${c.id}`} className={`${cardClass} press flex items-center gap-3 hover:ring-brasa-300`}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brasa-600 text-white" aria-hidden="true">
                    <Icon name="list" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-extrabold">{c.label ?? `Comanda ${c.id}`}</span>
                    <span className="block text-sm text-tinta-500">
                      {c.itemCount === 1 ? '1 item' : `${c.itemCount} itens`} · aberta às {time.format(new Date(c.openedAt))} por {c.openedBy}
                    </span>
                  </span>
                  <span className="text-lg font-extrabold">{formatBRL(c.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-nova" className={cardClass}>
        <CardTitle icon="plus" id="titulo-nova">
          Nova comanda
        </CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            open.mutate()
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field id="nova-identificacao" label="Identificação (opcional)">
              <input id="nova-identificacao" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Ex.: João, casal" className={inputClass} />
            </Field>
            <Field id="nova-pessoas" label="Pessoas">
              <input id="nova-pessoas" type="number" inputMode="numeric" min={1} max={99} value={people} onChange={(e) => setPeople(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Button type="submit" loading={open.isPending} className="w-full gap-1.5">
            <Icon name="plus" />
            Abrir comanda
          </Button>
        </form>
      </section>
    </div>
  )
}
