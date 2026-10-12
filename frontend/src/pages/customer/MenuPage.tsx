import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMenu } from '../../api/queries'
import type { PublicItem } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { filterMenu } from '../../lib/menu'
import { BrandHeader } from './BrandHeader'
import { CategoryNav } from './CategoryNav'
import { ItemDialog } from './ItemDialog'
import { MenuItemRow } from './MenuItemRow'

function MenuSkeleton() {
  return (
    <div role="status" aria-label="Carregando cardápio" className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton h-22 w-22 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3 py-1">
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-4 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export default function MenuPage() {
  const { data, isPending, isError, error, refetch } = useMenu()
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
        <div className="mx-auto max-w-3xl px-4 pt-6">
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

        {isPending && <MenuSkeleton />}
        {isError && (
          <div className="px-4 py-10">
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          </div>
        )}

        {data && data.length === 0 && (
          <p className="mx-auto max-w-md px-4 py-16 text-center text-lg text-tinta-700">
            O cardápio está sendo atualizado. Volte em instantes!
          </p>
        )}

        {data && data.length > 0 && (
          <>
            {categories.length > 0 && (
              <div className="mt-4">
                <CategoryNav categories={categories} activeId={currentId} onSelect={goTo} />
              </div>
            )}
            <div className="mx-auto max-w-3xl px-4 pb-16">
              {categories.length === 0 && (
                <p role="status" className="py-16 text-center text-lg text-tinta-700">
                  Nenhum item encontrado para “{query}”. Tente outra palavra.
                </p>
              )}
              {categories.map((category) => (
                <section key={category.id} id={`categoria-${category.id}`} data-category-id={category.id} aria-labelledby={`titulo-${category.id}`} className="pt-8">
                  <h2 id={`titulo-${category.id}`} className="mb-3 border-l-8 border-laranja-500 pl-3 text-2xl font-extrabold">
                    {category.name}
                  </h2>
                  <ul className="grid gap-1 sm:grid-cols-1">
                    {category.items.map((item) => (
                      <MenuItemRow key={item.id} item={item} onOpen={setSelected} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="bg-tinta-900 px-4 py-8 text-center text-sm text-tinta-300">
        <p>Bar &amp; Mercearia Planalto · Preços sujeitos a alteração</p>
        <p className="mt-2">
          <Link to="/admin" className="text-white underline underline-offset-4">
            Área do proprietário
          </Link>
        </p>
      </footer>
      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
