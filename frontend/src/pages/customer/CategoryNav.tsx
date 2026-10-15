import { useEffect, useRef } from 'react'
import type { MenuCategory } from '../../api/types'

interface CategoryNavProps {
  categories: MenuCategory[]
  activeId: number | null
  onSelect: (id: number) => void
}

export function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // mantém a categoria ativa visível na faixa horizontal, sem rolar a página
    const chip = activeRef.current
    const bar = chip?.parentElement
    if (chip && bar) bar.scrollTo?.({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [activeId])

  return (
    <nav aria-label="Categorias do cardápio" className="sticky top-0 z-20 border-b border-brasa-100 bg-white">
      <div className="mx-auto flex max-w-3xl snap-x gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none]">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              ref={active ? activeRef : undefined}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(category.id)}
              className={`min-h-11 shrink-0 snap-start rounded-full px-5 text-base font-extrabold transition-colors ${
                active ? 'bg-sol-300 text-tinta-900 ring-2 ring-brasa-600' : 'bg-white text-tinta-700 ring-1 ring-laranja-300 hover:bg-sol-100'
              }`}
            >
              {category.name}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
