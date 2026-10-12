import { useQuery } from '@tanstack/react-query'
import { getItem, getMenu, listCategories, searchItems } from './endpoints'
import type { ItemSearch } from './types'

export const keys = {
  menu: ['menu'] as const,
  items: ['admin', 'items'] as const,
  categories: ['admin', 'categories'] as const,
}

export const useMenu = () => useQuery({ queryKey: keys.menu, queryFn: ({ signal }) => getMenu(signal), staleTime: 30_000 })

export const useAdminItems = (params: ItemSearch) =>
  useQuery({ queryKey: [...keys.items, params], queryFn: () => searchItems(params), placeholderData: (previous) => previous })

export const useAdminItem = (id: number | undefined) =>
  useQuery({ queryKey: [...keys.items, 'one', id], queryFn: () => getItem(id as number), enabled: id !== undefined })

export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: listCategories })
