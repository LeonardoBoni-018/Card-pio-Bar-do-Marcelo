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
    <nav aria-label="Categorias do cardápio" className="sticky top-0 z-20 border-b border-brasa-100 bg-fundo/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              ref={active ? activeRef : undefined}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(category.id)}
              className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-extrabold transition-colors ${
                active ? 'bg-laranja-500 text-tinta-900' : 'bg-white text-tinta-700 ring-1 ring-tinta-300 hover:bg-laranja-100'
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
