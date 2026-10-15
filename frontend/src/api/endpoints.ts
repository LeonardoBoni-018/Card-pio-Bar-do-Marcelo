import { fastReadsEnabled, request } from './client'
import type { AdminItem, Category, ItemInput, ItemSearch, MenuCategory, Page, TokenResponse } from './types'

/**
 * Cardápio público. Com as leituras rápidas ligadas, tenta primeiro a função da Vercel (não dorme) e, se falhar
 * por qualquer motivo (exceto cancelamento), cai na API do Render como antes.
 */
export async function getMenu(signal?: AbortSignal): Promise<MenuCategory[]> {
  if (fastReadsEnabled()) {
    try {
      return await request<MenuCategory[]>('/api/fast/menu', { signal })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
    }
  }
  return request<MenuCategory[]>('/api/menu', { signal })
}

export const login = (username: string, password: string) =>
  request<TokenResponse>('/api/auth/login', { method: 'POST', json: { username, password } })

export function searchItems(params: ItemSearch) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.categoryId) query.set('categoryId', String(params.categoryId))
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))
  return request<Page<AdminItem>>(`/api/admin/items?${query}`, { auth: true })
}

export const getItem = (id: number) => request<AdminItem>(`/api/admin/items/${id}`, { auth: true })
export const createItem = (input: ItemInput) => request<AdminItem>('/api/admin/items', { method: 'POST', json: input, auth: true })
export const updateItem = (id: number, input: ItemInput) =>
  request<AdminItem>(`/api/admin/items/${id}`, { method: 'PUT', json: input, auth: true })
/** Converte um item salvo no corpo aceito pela API (para alterar só um campo ou duplicar). */
export const toInput = (item: AdminItem, changes: Partial<ItemInput> = {}): ItemInput => ({
  name: item.name,
  description: item.description,
  price: item.price,
  categoryId: item.categoryId,
  imageFilename: item.imageFilename,
  available: item.available,
  featured: item.featured,
  ...changes,
})
export const setFeatured = (item: AdminItem, featured: boolean) => updateItem(item.id, toInput(item, { featured }))
export const setAvailability = (id: number, available: boolean) =>
  request<AdminItem>(`/api/admin/items/${id}/availability`, { method: 'PATCH', json: { available }, auth: true })
export const deleteItem = (id: number) => request<void>(`/api/admin/items/${id}`, { method: 'DELETE', auth: true })

export const listCategories = () => request<Category[]>('/api/admin/categories', { auth: true })
export const createCategory = (name: string, displayOrder?: number) =>
  request<Category>('/api/admin/categories', { method: 'POST', json: { name, displayOrder }, auth: true })
export const updateCategory = (id: number, name: string, displayOrder?: number) =>
  request<Category>(`/api/admin/categories/${id}`, { method: 'PUT', json: { name, displayOrder }, auth: true })
export const deleteCategory = (id: number) => request<void>(`/api/admin/categories/${id}`, { method: 'DELETE', auth: true })

export function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<{ filename: string; url: string }>('/api/admin/images', { method: 'POST', form, auth: true })
}
