import { useQuery } from '@tanstack/react-query'
import { getItem, getMenu, listCategories, searchItems } from './endpoints'
import { readMenuCache, writeMenuCache } from '../lib/menuCache'
import type { ItemSearch } from './types'

export const keys = {
  menu: ['menu'] as const,
  items: ['admin', 'items'] as const,
  categories: ['admin', 'categories'] as const,
}

/**
 * O cardápio mostra primeiro o que este aparelho viu da última vez (se houver) e atualiza em segundo plano:
 * quem já visitou não espera a API acordar.
 */
export const useMenu = () => {
  const cached = readMenuCache()
  return useQuery({
    queryKey: keys.menu,
    queryFn: async ({ signal }) => {
      const menu = await getMenu(signal)
      writeMenuCache(menu)
      return menu
    },
    staleTime: 30_000,
    initialData: cached?.data,
    // o cardápio guardado só serve para mostrar algo na hora: conta como "velho" e é sempre buscado de novo
    initialDataUpdatedAt: 0,
  })
}

export const useAdminItems = (params: ItemSearch) =>
  useQuery({ queryKey: [...keys.items, params], queryFn: () => searchItems(params), placeholderData: (previous) => previous })

export const useAdminItem = (id: number | undefined) =>
  useQuery({ queryKey: [...keys.items, 'one', id], queryFn: () => getItem(id as number), enabled: id !== undefined })

export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: listCategories })
