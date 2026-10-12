import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { createCategory, deleteCategory, updateCategory } from '../../api/endpoints'
import { keys, useCategories } from '../../api/queries'
import type { Category } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Field, inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Spinner'
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
      <li className="flex flex-wrap items-center gap-3 p-4">
        <p className="min-w-0 flex-1 text-lg font-extrabold">{category.name}</p>
        <p className="text-sm text-tinta-500">Posição {category.displayOrder}</p>
        <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Editar ${category.name}`}>
          Editar
        </Button>
        <Button variant="ghost" onClick={() => onDelete(category)} aria-label={`Excluir ${category.name}`}>
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
        <Button type="submit" disabled={save.isPending}>
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
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold">Categorias</h1>
      <p className="mt-1 text-tinta-500">Agrupam os itens no cardápio, na ordem da posição (menor primeiro).</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) add.mutate()
        }}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <Field id="nova-categoria" label="Nova categoria">
            <input id="nova-categoria" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Porções" className={inputClass} />
          </Field>
        </div>
        <Button type="submit" disabled={add.isPending || !name.trim()}>
          Adicionar
        </Button>
      </form>

      <div className="mt-6">
        {categories.isPending && <Spinner label="Carregando categorias…" />}
        {categories.isError && <ErrorState message={categories.error.message} onRetry={() => void categories.refetch()} />}
        {categories.data?.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-tinta-700 ring-1 ring-brasa-100">Nenhuma categoria ainda. Crie a primeira acima.</p>}
        {categories.data && categories.data.length > 0 && (
          <ul className="divide-y divide-brasa-100 rounded-2xl bg-white ring-1 ring-brasa-100">
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
