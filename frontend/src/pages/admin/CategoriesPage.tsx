import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { createCategory, deleteCategory, updateCategory } from '../../api/endpoints'
import { keys, useCategories } from '../../api/queries'
import type { Category } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass, PageHeader } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { categoryIcon } from '../../lib/categoryIcon'
import { useToast } from '../../components/ui/Toast'

function CategoryRow({ category, onDelete }: { category: Category; onDelete: (c: Category) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [order, setOrder] = useState(String(category.displayOrder))
  const toast = useToast()
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: () => updateCategory(category.id, name.trim(), Number(order) || 0),
    onSuccess: () => {
      toast.success('Categoria atualizada.')
      setEditing(false)
      void queryClient.invalidateQueries({ queryKey: keys.categories })
      void queryClient.invalidateQueries({ queryKey: keys.items })
      void queryClient.invalidateQueries({ queryKey: keys.menu })
    },
    onError: (error) => toast.error(error.message),
  })

  if (!editing) {
    return (
      <li className="flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 p-4">
        {/* no celular o nome ocupa a linha toda (quebra se for longo); posição e botões ficam na linha de baixo */}
        <span className="flex min-w-0 basis-full items-center gap-3 sm:basis-0 sm:flex-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brasa-600 text-white" aria-hidden="true">
            <Icon name={categoryIcon(category.name)} className="size-5" />
          </span>
          <p className="min-w-0 break-words text-lg font-extrabold">{category.name}</p>
        </span>
        <p className="mr-auto text-sm text-tinta-500 sm:mr-0">Posição {category.displayOrder}</p>
        <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Editar ${category.name}`} className="gap-1.5">
          <Icon name="pencil" />
          Editar
        </Button>
        <Button variant="ghost" onClick={() => onDelete(category)} aria-label={`Excluir ${category.name}`} className="gap-1.5 text-brasa-700">
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
          if (name.trim()) save.mutate()
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1">
          <Field id={`nome-${category.id}`} label="Nome">
            <input id={`nome-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className={inputClass} />
          </Field>
        </div>
        <div className="w-28">
          <Field id={`ordem-${category.id}`} label="Posição">
            <input id={`ordem-${category.id}`} type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Button type="submit" loading={save.isPending}>
          Salvar
        </Button>
        <Button variant="secondary" onClick={() => { setEditing(false); setName(category.name); setOrder(String(category.displayOrder)) }}>
          Cancelar
        </Button>
      </form>
    </li>
  )
}

export default function CategoriesPage() {
  const categories = useCategories()
  const [name, setName] = useState('')
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.categories })
    void queryClient.invalidateQueries({ queryKey: keys.menu })
  }

  const add = useMutation({
    mutationFn: () => createCategory(name.trim(), (categories.data?.length ?? 0) + 1),
    onSuccess: (created) => {
      toast.success(`Categoria “${created.name}” criada.`)
      setName('')
      refresh()
    },
    onError: (error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      toast.success('Categoria excluída.')
      refresh()
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader icon="tags" title="Categorias" subtitle="Agrupam os itens no cardápio, na ordem da posição (menor primeiro)." />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) add.mutate()
        }}
        className={`${cardClass} flex flex-wrap items-end gap-3`}
      >
        <div className="min-w-56 flex-1">
          <Field id="nova-categoria" label="Nova categoria">
            <input id="nova-categoria" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Porções" className={inputClass} />
          </Field>
        </div>
        <Button type="submit" loading={add.isPending} disabled={!name.trim()} className="gap-1.5">
          <Icon name="plus" />
          Adicionar
        </Button>
      </form>

      <div>
        {categories.isPending && <Spinner label="Carregando categorias…" />}
        {categories.isError && <ErrorState message={categories.error.message} onRetry={() => void categories.refetch()} />}
        {categories.data?.length === 0 && (
          <p className={`${cardClass} py-8 text-center text-tinta-700`}>
            <Icon name="tags" className="mx-auto mb-2 size-8 text-brasa-700" />
            Nenhuma categoria ainda. Crie a primeira acima.
          </p>
        )}
        {categories.data && categories.data.length > 0 && (
          <ul className="divide-y divide-brasa-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brasa-100">
            {categories.data.map((category) => (
              <CategoryRow key={category.id} category={category} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir categoria?"
        message={`“${toDelete?.name ?? ''}” será removida. Só é possível excluir categorias sem itens.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
