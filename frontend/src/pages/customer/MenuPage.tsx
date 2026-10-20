import { useEffect, useMemo, useState } from 'react'
import { useMenu } from '../../api/queries'
import type { PublicItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { BrandLoader } from '../../components/ui/BrandLoader'
import { Icon } from '../../components/ui/Icon'
import { categoryIcon } from '../../lib/categoryIcon'
import { filterMenu } from '../../lib/menu'
import { useSlow } from '../../lib/useSlow'
import { BrandHeader } from './BrandHeader'
import { CategoryNav } from './CategoryNav'
import { ItemDialog } from './ItemDialog'
import { MenuItemRow } from './MenuItemRow'

function MenuSkeleton({ waking }: { waking: boolean }) {
  return (
    <div role="status" aria-label="Carregando cardápio" className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      {waking && (
        <p className="animate-fade-up rounded-2xl bg-sol-100 ring-1 ring-sol-500 px-4 py-3 text-base font-semibold text-tinta-900">
          Estamos acordando o cardápio… Na primeira visita do dia isso pode levar até 1 minuto. Não precisa recarregar!
        </p>
      )}
      <BrandLoader size="lg" label="Preparando o cardápio…" silent />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton size-24 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3 py-1">
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-4 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Botão flutuante para voltar ao topo, só depois de rolar bastante (cardápios longos no celular). */
function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
      className="press animate-pop fixed bottom-4 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-brasa-600 text-white shadow-lg active:bg-brasa-800"
    >
      <Icon name="up" className="size-6" />
    </button>
  )
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export default function MenuPage() {
  const { data, isPending, isError, error, refetch, failureCount } = useMenu()
  const waking = useSlow(isPending, 4000) || (isPending && failureCount > 0)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PublicItem | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  const categories = useMemo(() => filterMenu(data ?? [], query), [data, query])

  // destaca na barra a categoria que está na tela enquanto o cliente rola
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || categories.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveId(Number((visible.target as HTMLElement).dataset.categoryId))
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    document.querySelectorAll('[data-category-id]').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [categories])

  const currentId = categories.some((c) => c.id === activeId) ? activeId : (categories[0]?.id ?? null)

  const goTo = (id: number) => {
    setActiveId(id)
    document.getElementById(`categoria-${id}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main>
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-5">
          <label htmlFor="busca" className="sr-only">
            Buscar no cardápio
          </label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-500" />
            <input
              id="busca"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no cardápio… (ex.: cerveja, batata)"
              autoComplete="off"
              className="block min-h-12 w-full rounded-full border border-tinta-300 bg-white pl-12 pr-12 text-base shadow-sm placeholder:text-tinta-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Apagar texto da busca"
                className="press absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-tinta-500 hover:bg-brasa-50"
              >
                <Icon name="close" className="size-5" />
              </button>
            )}
          </div>
        </div>

        {isPending && <MenuSkeleton waking={waking} />}
        {isError && !data && (
          <div className="px-4 py-10">
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          </div>
        )}
        {isError && data && (
          <p role="status" className="mx-auto mt-4 max-w-3xl rounded-2xl bg-sol-100 ring-1 ring-sol-500 px-4 py-3 text-sm font-semibold text-tinta-900">
            Não foi possível atualizar agora. Mostrando o cardápio da sua última visita; os preços podem ter mudado.
          </p>
        )}

        {data && data.length === 0 && (
          <p className="mx-auto max-w-md px-4 py-16 text-center text-lg text-tinta-700">
            O cardápio está sendo atualizado. Volte em instantes!
          </p>
        )}

        {data && data.length > 0 && (
          <>
            {categories.length > 0 && (
              <CategoryNav categories={categories} activeId={currentId} onSelect={goTo} />
            )}
            <div className="mx-auto max-w-3xl px-4 pb-16">
              {categories.length === 0 && (
                <div role="status" className="animate-fade-in py-14 text-center text-lg text-tinta-700">
                  <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-sol-100 text-brasa-700 ring-1 ring-sol-500">
                    <Icon name="search" className="size-7" />
                  </span>
                  <p>Nenhum item encontrado para “{query}”. Tente outra palavra.</p>
                  <button type="button" onClick={() => setQuery('')} className="press mt-4 min-h-11 rounded-full px-5 text-base font-bold text-brasa-700 ring-1 ring-brasa-600">
                    Limpar busca
                  </button>
                </div>
              )}
              {categories.map((category) => (
                <section key={category.id} id={`categoria-${category.id}`} data-category-id={category.id} aria-labelledby={`titulo-${category.id}`} className="pt-7">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brasa-600 text-white shadow-sm" aria-hidden="true">
                      <Icon name={categoryIcon(category.name)} className="size-6" />
                    </span>
                    <h2 id={`titulo-${category.id}`} className="min-w-0 flex-1 text-2xl font-extrabold">
                      {category.name}
                    </h2>
                    <span className="rounded-full bg-sol-100 px-2.5 py-0.5 text-sm font-bold text-tinta-700 ring-1 ring-sol-500/60">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <ul className="grid gap-3 sm:gap-1">
                    {category.items.map((item, index) => (
                      <MenuItemRow key={item.id} item={item} onOpen={setSelected} index={index} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="bg-brasa-800 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-sm font-semibold text-sol-100">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
          <p className="flex items-center gap-2 text-base font-extrabold text-white">
            <Icon name="store" className="size-5 text-sol-300" />
            Bar &amp; Mercearia Planalto
          </p>
          <p className="flex items-center gap-2">
            <Icon name="info" className="size-4" />
            Preços sujeitos a alteração
          </p>
        </div>
      </footer>
      <BackToTop />
      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
