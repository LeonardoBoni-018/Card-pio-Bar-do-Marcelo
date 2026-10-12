import type { MenuCategory } from '../api/types'
import { normalize } from './format'

/** Filtra o cardápio por nome/descrição (sem acento, sem diferenciar maiúsculas) e esconde categorias vazias. */
export function filterMenu(menu: MenuCategory[], query: string): MenuCategory[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return menu
  return menu
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const haystack = normalize(`${item.name} ${item.description}`)
        return terms.every((term) => haystack.includes(term))
      }),
    }))
    .filter((category) => category.items.length > 0)
}
