import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { imageSrc } from '../../api/client'
import { deleteItem, setAvailability } from '../../api/endpoints'
import { keys, useAdminItems, useCategories } from '../../api/queries'
import type { AdminItem, Page } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { MugIcon } from '../../components/MugIcon'
import { Button, LinkButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'
import { formatBRL } from '../../lib/format'

export default function ItemsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoryId = Number(params.get('categoryId')) || undefined
  const page = Number(params.get('page')) || 0

  const [search, setSearch] = useState(q)
  const [toDelete, setToDelete] = useState<AdminItem | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const categories = useCategories()
  const items = useAdminItems({ q, categoryId, page })

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setParams(next, { replace: true })
  }

  // busca com atraso, para não consultar a API a cada tecla
  useEffect(() => {
    if (search === q) return
    const timer = setTimeout(() => update({ q: search.trim() || undefined, page: undefined }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const availability = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) => setAvailability(id, available),
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: keys.items })
      const previous = queryClient.getQueriesData<Page<AdminItem>>({ queryKey: keys.items })
      queryClient.setQueriesData<Page<AdminItem>>({ queryKey: keys.items }, (old) =>
        old && 'content' in old ? { ...old, content: old.content.map((i) => (i.id === id ? { ...i, available } : i)) } : old,
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(error.message)
    },
    onSuccess: (item) => toast.success(item.available ? `“${item.name}” voltou ao cardápio.` : `“${item.name}” saiu do cardápio.`),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.items })
      void queryClient.invalidateQueries({ queryKey: keys.menu })
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => {
      toast.success(`“${toDelete?.name}” foi excluído.`)
      setToDelete(null)
      void queryClient.invalidateQueries({ queryKey: keys.items })
      void queryClient.invalidateQueries({ queryKey: keys.menu })
    },
    onError: (error) => {
      toast.error(error.message)
      setToDelete(null)
    },
  })

  const hasFilters = Boolean(q || categoryId)
  const noCategories = categories.data?.length === 0

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Itens do cardápio</h1>
        <LinkButton to="/admin/items/new">Novo item</LinkButton>
      </div>

      {noCategories && (
        <p role="status" className="mt-4 rounded-lg bg-laranja-100 px-4 py-3 font-semibold">
          Antes de cadastrar itens, crie ao menos uma categoria (ex.: Cervejas).{' '}
          <Link to="/admin/categories" className="text-ceu-700 underline underline-offset-4">
            Criar categoria
          </Link>
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="busca-itens" className="sr-only">
            Buscar item pelo nome
          </label>
          <input
            id="busca-itens"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item pelo nome"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="filtro-categoria" className="sr-only">
            Filtrar por categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoryId ?? ''}
            onChange={(e) => update({ categoryId: e.target.value || undefined, page: undefined })}
            className={inputClass}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        {items.isPending && <Spinner label="Carregando itens…" />}
        {items.isError && <ErrorState message={items.error.message} onRetry={() => void items.refetch()} />}

        {items.data && items.data.content.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-brasa-100">
            <p className="text-lg font-bold">{hasFilters ? 'Nenhum item encontrado.' : 'Você ainda não cadastrou nenhum item.'}</p>
            <p className="mt-1 text-tinta-500">{hasFilters ? 'Tente outra busca ou limpe os filtros.' : 'Comece pelo primeiro prato ou bebida.'}</p>
            {!hasFilters && !noCategories && <LinkButton to="/admin/items/new" className="mt-5">Cadastrar primeiro item</LinkButton>}
          </div>
        )}

        {items.data && items.data.content.length > 0 && (
          <ul className="divide-y divide-brasa-100 rounded-2xl bg-white ring-1 ring-brasa-100">
            {items.data.content.map((item) => {
              const src = imageSrc(item.imageUrl)
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
                  {src ? (
                    <img src={src} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-laranja-500 to-brasa-600" aria-hidden="true">
                      <MugIcon className="h-9 w-9" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-40">
                    <p className={`truncate text-lg font-extrabold ${item.available ? '' : 'text-tinta-500 line-through'}`}>{item.name}</p>
                    <p className="text-sm text-tinta-500">
                      {item.categoryName} · <span className="font-bold text-brasa-700">{formatBRL(item.price)}</span>
                      {item.featured && ' · Destaque'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.available}
                      onChange={(available) => availability.mutate({ id: item.id, available })}
                      label={`Disponível: ${item.name}`}
                    />
                    <span className="w-24 text-sm font-semibold text-tinta-700" aria-hidden="true">
                      {item.available ? 'No cardápio' : 'Indisponível'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <LinkButton to={`/admin/items/${item.id}`} variant="secondary" aria-label={`Editar ${item.name}`}>
                      Editar
                    </LinkButton>
                    <Button variant="ghost" onClick={() => setToDelete(item)} aria-label={`Excluir ${item.name}`}>
                      Excluir
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {items.data && items.data.totalPages > 1 && (
          <nav aria-label="Paginação" className="mt-5 flex items-center justify-between">
            <Button variant="secondary" disabled={page === 0} onClick={() => update({ page: String(page - 1) })}>
              Anterior
            </Button>
            <p className="text-sm font-semibold text-tinta-700">
              Página {items.data.page + 1} de {items.data.totalPages}
            </p>
            <Button variant="secondary" disabled={page + 1 >= items.data.totalPages} onClick={() => update({ page: String(page + 1) })}>
              Próxima
            </Button>
          </nav>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir este item?"
        message={`“${toDelete?.name ?? ''}” será removido do cardápio de forma permanente.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
