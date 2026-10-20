import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { imageSrc } from '../../api/client'
import { deleteItem, setAvailability, setFeatured } from '../../api/endpoints'
import { keys, useAdminItems, useAllItems, useCategories } from '../../api/queries'
import type { AdminItem, Page } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { LogoMark } from '../../components/Logo'
import { Button, LinkButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { inputClass } from '../../components/ui/Field'
import { Icon, IconFilled, type IconName } from '../../components/ui/Icon'
import { cardClass, PageHeader } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'
import { formatBRL } from '../../lib/format'

type Filtro = 'indisponiveis' | 'sem-foto' | 'destaques'
const FILTROS: Array<{ id: Filtro; label: string; icon: IconName; test: (item: AdminItem) => boolean }> = [
  { id: 'indisponiveis', label: 'Indisponíveis', icon: 'eyeOff', test: (i) => !i.available },
  { id: 'sem-foto', label: 'Sem foto', icon: 'camera', test: (i) => !i.imageUrl },
  { id: 'destaques', label: 'Destaques', icon: 'star', test: (i) => i.featured },
]

/** Botão de ação do item: só ícone no celular (alvo de 48 px), ícone + nome a partir de telas médias. */
const actionClass = 'min-h-12 gap-1.5 px-0 sm:px-4 md:min-h-11'
const Label = ({ children }: { children: string }) => <span className="sr-only sm:not-sr-only">{children}</span>

export default function ItemsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoryId = Number(params.get('categoryId')) || undefined
  const page = Number(params.get('page')) || 0
  const filtro = FILTROS.find((f) => f.id === params.get('filtro'))

  const [search, setSearch] = useState(q)
  const [toDelete, setToDelete] = useState<AdminItem | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const categories = useCategories()
  const paged = useAdminItems({ q, categoryId, page })
  const all = useAllItems()

  // com um filtro rápido ligado, a lista vem do cardápio inteiro (já carregado para o resumo), filtrada aqui mesmo
  const filtered = filtro && all.data ? all.data.filter((i) => filtro.test(i) && (!categoryId || i.categoryId === categoryId) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))) : null
  const items = filtro
    ? { ...all, data: filtered ? { content: filtered, page: 0, size: filtered.length, totalElements: filtered.length, totalPages: 1 } : undefined }
    : paged

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

  const featured = useMutation({
    mutationFn: ({ item, value }: { item: AdminItem; value: boolean }) => setFeatured(item, value),
    onSuccess: (item) => toast.success(item.featured ? `“${item.name}” ganhou destaque.` : `“${item.name}” saiu dos destaques.`),
    onError: (error) => toast.error(error.message),
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

  const hasFilters = Boolean(q || categoryId || filtro)
  const noCategories = categories.data?.length === 0

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        icon="list"
        title="Itens do cardápio"
        subtitle="Cadastre, edite e esconda pratos e bebidas."
        action={
          /* celular: botão flutuante ao alcance do polegar; computador: botão comum ao lado do título */
          <LinkButton to="/admin/items/new" variant="accent" className="fixed bottom-24 right-4 z-20 min-h-14 gap-2 rounded-full px-6 shadow-lg md:static md:min-h-11 md:rounded-lg md:shadow-none">
            <Icon name="plus" className="size-5" />
            Novo item
          </LinkButton>
        }
      />

      {noCategories && (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-sol-100 px-4 py-3 font-semibold ring-1 ring-sol-500">
          <Icon name="info" className="mt-0.5 size-5 text-brasa-700" />
          <span>
            Antes de cadastrar itens, crie ao menos uma categoria (ex.: Cervejas).{' '}
            <Link to="/admin/categories" className="text-brasa-700 underline underline-offset-4">
              Criar categoria
            </Link>
          </span>
        </p>
      )}

      {all.data && all.data.length > 0 && (
        <section aria-label="Resumo do cardápio" className="space-y-3">
          <p className="text-sm font-bold text-tinta-700">
            {all.data.length} {all.data.length === 1 ? 'item' : 'itens'} · {all.data.filter((i) => i.available).length} no cardápio agora
          </p>
          <div className="grid grid-cols-3 gap-3">
            {FILTROS.map((f) => {
              const count = all.data.filter(f.test).length
              const active = filtro?.id === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${f.label}: ${count}`}
                  onClick={() => update({ filtro: active ? undefined : f.id, page: undefined })}
                  className={`press flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center ring-1 transition-colors ${
                    active ? 'bg-sol-300 text-tinta-900 ring-2 ring-brasa-600' : 'bg-white text-tinta-700 shadow-sm ring-brasa-100 hover:bg-sol-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    <Icon name={f.icon} className={`size-5 ${active ? 'text-tinta-900' : 'text-brasa-700'}`} />
                    <span className="text-2xl font-extrabold leading-none tabular-nums">{count}</span>
                  </span>
                  <span className="text-xs font-extrabold" aria-hidden="true">
                    {f.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="relative">
          <label htmlFor="busca-itens" className="sr-only">
            Buscar item pelo nome
          </label>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-tinta-500" />
          <input
            id="busca-itens"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item pelo nome"
            className={`${inputClass} pl-11`}
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

      <div>
        {items.isPending && <Spinner label="Carregando itens…" />}
        {items.isError && <ErrorState message={items.error.message} onRetry={() => void items.refetch()} />}

        {items.data && items.data.content.length === 0 && (
          <div className={`${cardClass} py-10 text-center`}>
            <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-sol-100 text-brasa-700 ring-1 ring-sol-500">
              <Icon name={hasFilters ? 'search' : 'food'} className="size-7" />
            </span>
            <p className="text-lg font-bold">{hasFilters ? 'Nenhum item encontrado.' : 'Você ainda não cadastrou nenhum item.'}</p>
            <p className="mt-1 text-tinta-500">{hasFilters ? 'Tente outra busca ou limpe os filtros.' : 'Comece pelo primeiro prato ou bebida.'}</p>
            {!hasFilters && !noCategories && <LinkButton to="/admin/items/new" className="mt-5">Cadastrar primeiro item</LinkButton>}
          </div>
        )}

        {items.data && items.data.content.length > 0 && (
          <ul className="grid gap-3">
            {items.data.content.map((item, index) => {
              const src = imageSrc(item.imageUrl, 'thumb')
              return (
                <li key={item.id} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} className={`animate-fade-up ${cardClass} p-3 sm:p-4 xl:flex xl:items-center xl:gap-4`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {src ? (
                      <img src={src} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-sol-100 ring-1 ring-sol-500/50" aria-hidden="true">
                        <LogoMark className="size-12 object-contain" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-extrabold leading-tight ${item.available ? '' : 'text-tinta-500 line-through'}`}>{item.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-tinta-500">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="tag" className="size-4" />
                          {item.categoryName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="rounded-md bg-sol-100 px-1.5 font-extrabold text-brasa-700">{formatBRL(item.price)}</span>
                        {item.featured && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-bold text-tinta-700">
                              <IconFilled name="star" className="size-4 text-sol-500" />
                              Destaque
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3 border-t border-brasa-100 pt-3 xl:mt-0 xl:flex xl:items-center xl:gap-3 xl:space-y-0 xl:border-0 xl:pt-0">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.available}
                        onChange={(available) => availability.mutate({ id: item.id, available })}
                        label={`Disponível: ${item.name}`}
                      />
                      <span className="flex items-center gap-1.5 text-sm font-bold text-tinta-700 xl:w-32" aria-hidden="true">
                        <Icon name={item.available ? 'eye' : 'eyeOff'} className="size-4" />
                        {item.available ? 'No cardápio' : 'Indisponível'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:flex">
                      <button
                        type="button"
                        aria-pressed={item.featured}
                        aria-label={`Destacar ${item.name}`}
                        title={item.featured ? 'Tirar dos destaques' : 'Destacar no cardápio'}
                        onClick={() => featured.mutate({ item, value: !item.featured })}
                        className={`press inline-flex min-h-12 items-center justify-center rounded-xl sm:size-11 sm:min-h-0 sm:rounded-lg ${item.featured ? 'bg-sol-300 text-tinta-900' : 'text-tinta-500 ring-1 ring-tinta-300 hover:bg-sol-100'}`}
                      >
                        {item.featured ? <IconFilled name="star" /> : <Icon name="star" />}
                      </button>
                      <LinkButton to={`/admin/items/new?copiar=${item.id}`} variant="secondary" aria-label={`Duplicar ${item.name}`} className={actionClass}>
                        <Icon name="copy" />
                        <Label>Duplicar</Label>
                      </LinkButton>
                      <LinkButton to={`/admin/items/${item.id}`} variant="secondary" aria-label={`Editar ${item.name}`} className={actionClass}>
                        <Icon name="pencil" />
                        <Label>Editar</Label>
                      </LinkButton>
                      <Button variant="ghost" onClick={() => setToDelete(item)} aria-label={`Excluir ${item.name}`} className={`${actionClass} text-brasa-700 ring-1 ring-brasa-100`}>
                        <Icon name="trash" />
                        <Label>Excluir</Label>
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {items.data && items.data.totalPages > 1 && (
          <nav aria-label="Paginação" className="mt-5 flex items-center justify-between gap-2">
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
