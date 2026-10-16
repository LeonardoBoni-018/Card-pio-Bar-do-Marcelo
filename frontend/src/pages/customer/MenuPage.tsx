import { useEffect, useMemo, useState } from 'react'
import { useMenu } from '../../api/queries'
import type { PublicItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { filterMenu } from '../../lib/menu'
import { useSlow } from '../../lib/useSlow'
import { BrandHeader } from './BrandHeader'
import { CategoryNav } from './CategoryNav'
import { ItemDialog } from './ItemDialog'
import { MenuItemRow } from './MenuItemRow'

function MenuSkeleton({ waking }: { waking: boolean }) {
  return (
    <div role="status" aria-label="Carregando cardápio" className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      {waking && (
        <p className="animate-fade-up rounded-2xl bg-sol-100 ring-1 ring-sol-500 px-4 py-3 text-base font-semibold text-tinta-900">
          Estamos acordando o cardápio… Na primeira visita do dia isso pode levar até 1 minuto. Não precisa recarregar!
        </p>
      )}
      {Array.from({ length: 6 }, (_, i) => (
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
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 15l6-6 6 6" />
      </svg>
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
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-6">
          <label htmlFor="busca" className="sr-only">
            Buscar no cardápio
          </label>
          <input
            id="busca"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no cardápio… (ex.: cerveja, batata)"
            autoComplete="off"
            className="block min-h-12 w-full rounded-full border border-tinta-300 bg-white px-5 text-base placeholder:text-tinta-500"
          />
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
                <div role="status" className="animate-fade-in py-16 text-center text-lg text-tinta-700">
                  <p>Nenhum item encontrado para “{query}”. Tente outra palavra.</p>
                  <button type="button" onClick={() => setQuery('')} className="press mt-4 min-h-11 rounded-full px-5 text-base font-bold text-brasa-700 ring-1 ring-brasa-600">
                    Limpar busca
                  </button>
                </div>
              )}
              {categories.map((category) => (
                <section key={category.id} id={`categoria-${category.id}`} data-category-id={category.id} aria-labelledby={`titulo-${category.id}`} className="pt-8">
                  <h2 id={`titulo-${category.id}`} className="mb-3 border-l-8 border-laranja-500 pl-3 text-2xl font-extrabold">
                    {category.name}
                  </h2>
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
      <footer className="bg-brasa-800 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center text-sm font-semibold text-sol-100">
        <p>Bar &amp; Mercearia Planalto · Preços sujeitos a alteração</p>
      </footer>
      <BackToTop />
      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
