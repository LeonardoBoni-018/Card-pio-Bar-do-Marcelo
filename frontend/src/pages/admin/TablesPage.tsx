import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { createTable, createTablesBatch, deleteTable, updateTable } from '../../api/endpoints'
import { keys, useTables } from '../../api/queries'
import type { DiningTable } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass, CardTitle } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'

function TableRow({ table, onDelete }: { table: DiningTable; onDelete: (t: DiningTable) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(table.name)
  const [order, setOrder] = useState(String(table.displayOrder))
  const toast = useToast()
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: (changes: { active?: boolean }) =>
      updateTable(table.id, {
        name: changes.active === undefined ? name.trim() : table.name,
        displayOrder: changes.active === undefined ? Number(order) || 0 : table.displayOrder,
        active: changes.active ?? table.active,
      }),
    onSuccess: (saved, changes) => {
      toast.success(changes.active === undefined ? 'Mesa atualizada.' : saved.active ? `${saved.name} ativada.` : `${saved.name} desativada.`)
      setEditing(false)
      void queryClient.invalidateQueries({ queryKey: keys.tables })
    },
    onError: (error) => toast.error(error.message),
  })

  if (!editing) {
    return (
      <li className="flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 p-4">
        <span className="flex min-w-0 basis-full items-center gap-3 sm:basis-0 sm:flex-1">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${table.active ? 'bg-brasa-600' : 'bg-tinta-300'}`} aria-hidden="true">
            <Icon name="store" />
          </span>
          <span className="min-w-0">
            <p className={`break-words text-lg font-extrabold ${table.active ? '' : 'text-tinta-500 line-through'}`}>{table.name}</p>
            <p className="text-sm text-tinta-500">
              Posição {table.displayOrder} · {table.active ? 'Ativa' : 'Desativada (não aparece para os garçons)'}
            </p>
          </span>
        </span>
        <span className="mr-auto flex items-center gap-2 sm:mr-0">
          <Switch checked={table.active} onChange={(active) => save.mutate({ active })} label={`${table.name} ativa`} disabled={save.isPending} />
        </span>
        <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Editar ${table.name}`} className="gap-1.5">
          <Icon name="pencil" />
          Editar
        </Button>
        <Button variant="ghost" onClick={() => onDelete(table)} aria-label={`Excluir ${table.name}`} className="gap-1.5 text-brasa-700">
          <Icon name="trash" />
          Excluir
        </Button>
      </li>
    )
  }

  return (
    <li className="p-4">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (name.trim()) save.mutate({})
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1">
          <Field id={`mesa-nome-${table.id}`} label="Nome">
            <input id={`mesa-nome-${table.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className={inputClass} />
          </Field>
        </div>
        <div className="w-28">
          <Field id={`mesa-ordem-${table.id}`} label="Posição">
            <input id={`mesa-ordem-${table.id}`} type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Button type="submit" loading={save.isPending}>
          Salvar
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditing(false)
            setName(table.name)
            setOrder(String(table.displayOrder))
          }}
        >
          Cancelar
        </Button>
      </form>
    </li>
  )
}

export default function TablesPage() {
  const tables = useTables()
  const [quantity, setQuantity] = useState('10')
  const [prefix, setPrefix] = useState('Mesa')
  const [name, setName] = useState('')
  const [toDelete, setToDelete] = useState<DiningTable | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: keys.tables })

  const batch = useMutation({
    mutationFn: () => createTablesBatch(Number(quantity), prefix.trim() || undefined),
    onSuccess: (created) => {
      toast.success(created.length === 0 ? 'Essas mesas já existiam.' : created.length === 1 ? '1 mesa criada.' : `${created.length} mesas criadas.`)
      refresh()
    },
    onError: (error) => toast.error(error.message),
  })

  const add = useMutation({
    mutationFn: () => createTable({ name: name.trim(), displayOrder: (tables.data?.length ?? 0) + 1 }),
    onSuccess: (created) => {
      toast.success(`“${created.name}” criada.`)
      setName('')
      refresh()
    },
    onError: (error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteTable(id),
    onSuccess: () => {
      toast.success('Mesa excluída.')
      refresh()
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  })

  const validQuantity = Number(quantity) >= 1 && Number(quantity) <= 100

  return (
    <div className="space-y-5">
      <section aria-labelledby="titulo-lote" className={cardClass}>
        <CardTitle icon="plus" id="titulo-lote">
          Criar mesas numeradas
        </CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (validQuantity) batch.mutate()
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="w-32">
            <Field id="lote-quantidade" label="Quantidade">
              <input
                id="lote-quantidade"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="min-w-40 flex-1">
            <Field id="lote-prefixo" label="Nome">
              <input id="lote-prefixo" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={30} className={inputClass} />
            </Field>
          </div>
          <Button type="submit" loading={batch.isPending} disabled={!validQuantity}>
            Criar
          </Button>
        </form>
        <p className="mt-2 text-sm text-tinta-500">
          Cria “{prefix.trim() || 'Mesa'} 1” até “{prefix.trim() || 'Mesa'} {validQuantity ? Number(quantity) : 'N'}”. As que já existem são mantidas.
        </p>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) add.mutate()
        }}
        className={`${cardClass} flex flex-wrap items-end gap-3`}
      >
        <div className="min-w-56 flex-1">
          <Field id="nova-mesa" label="Outro ponto de atendimento">
            <input id="nova-mesa" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex.: Balcão, Varanda 1" className={inputClass} />
          </Field>
        </div>
        <Button type="submit" loading={add.isPending} disabled={!name.trim()} className="gap-1.5">
          <Icon name="plus" />
          Adicionar
        </Button>
      </form>

      <div>
        {tables.isPending && <Spinner label="Carregando mesas…" />}
        {tables.isError && <ErrorState message={tables.error.message} onRetry={() => void tables.refetch()} />}
        {tables.data?.length === 0 && (
          <p className={`${cardClass} py-8 text-center text-tinta-700`}>
            <Icon name="store" className="mx-auto mb-2 size-8 text-brasa-700" />
            Nenhuma mesa ainda. Crie as mesas numeradas acima.
          </p>
        )}
        {tables.data && tables.data.length > 0 && (
          <ul aria-label="Mesas" className="divide-y divide-brasa-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brasa-100">
            {tables.data.map((table) => (
              <TableRow key={table.id} table={table} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir mesa?"
        message={`“${toDelete?.name ?? ''}” será removida. Para só tirar da lista dos garçons, use o botão de ativa.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
