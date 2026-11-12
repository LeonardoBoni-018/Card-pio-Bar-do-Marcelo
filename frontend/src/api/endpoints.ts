import { fastReadsEnabled, request } from './client'
import type { SalesReport, AddItemInput, AdminItem, Comanda, ComandaListItem, ComandaStatus, ServiceMenuCategory, Category, DiningTable, ItemInput, ItemSearch, MenuCategory, Page, TableInput, TableOverview, TokenResponse, Waiter, WaiterInput } from './types'

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
  priceUnit: item.priceUnit ?? 'UNIT',
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

// ---- Comandas (atrás da chave VITE_FEATURE_COMANDAS) ----
export const listTables = () => request<DiningTable[]>('/api/admin/mesas', { auth: true })
export const createTable = (input: TableInput) => request<DiningTable>('/api/admin/mesas', { method: 'POST', json: input, auth: true })
export const createTablesBatch = (quantity: number, prefix?: string) =>
  request<DiningTable[]>('/api/admin/mesas/lote', { method: 'POST', json: { quantity, prefix }, auth: true })
export const updateTable = (id: number, input: TableInput) => request<DiningTable>(`/api/admin/mesas/${id}`, { method: 'PUT', json: input, auth: true })
export const deleteTable = (id: number) => request<void>(`/api/admin/mesas/${id}`, { method: 'DELETE', auth: true })

export const listWaiters = () => request<Waiter[]>('/api/admin/garcons', { auth: true })
export const createWaiter = (input: WaiterInput) => request<Waiter>('/api/admin/garcons', { method: 'POST', json: input, auth: true })
export const updateWaiter = (id: number, input: WaiterInput) => request<Waiter>(`/api/admin/garcons/${id}`, { method: 'PUT', json: input, auth: true })

/** Mesas ativas, para o garçom. */
export const listServiceTables = () => request<TableOverview[]>('/api/pedidos/mesas', { auth: true })

export const getServiceMenu = () => request<ServiceMenuCategory[]>('/api/pedidos/cardapio', { auth: true })
export const getComanda = (id: number) => request<Comanda>(`/api/pedidos/comandas/${id}`, { auth: true })
export const openComanda = (tableId: number, label?: string, people?: number) =>
  request<Comanda>('/api/pedidos/comandas', { method: 'POST', json: { tableId, label, people }, auth: true })
export const updateComanda = (id: number, label: string | undefined, people: number | undefined) =>
  request<Comanda>(`/api/pedidos/comandas/${id}`, { method: 'PATCH', json: { label, people }, auth: true })
export const addComandaItem = (id: number, input: AddItemInput) => request<Comanda>(`/api/pedidos/comandas/${id}/itens`, { method: 'POST', json: input, auth: true })
export const updateComandaItem = (id: number, itemId: number, quantity: number, note?: string | null) =>
  request<Comanda>(`/api/pedidos/comandas/${id}/itens/${itemId}`, { method: 'PATCH', json: { quantity, note: note ?? undefined }, auth: true })
export const removeComandaItem = (id: number, itemId: number) => request<Comanda>(`/api/pedidos/comandas/${id}/itens/${itemId}`, { method: 'DELETE', auth: true })
export const moveComanda = (id: number, tableId: number) => request<Comanda>(`/api/pedidos/comandas/${id}/mover`, { method: 'POST', json: { tableId }, auth: true })
export const mergeComanda = (id: number, fromComandaId: number) =>
  request<Comanda>(`/api/pedidos/comandas/${id}/juntar`, { method: 'POST', json: { fromComandaId }, auth: true })
export const closeComanda = (id: number, discount: number, people?: number) =>
  request<Comanda>(`/api/pedidos/comandas/${id}/fechar`, { method: 'POST', json: { discount, people }, auth: true })
export const discardComanda = (id: number) => request<Comanda>(`/api/pedidos/comandas/${id}/descartar`, { method: 'POST', auth: true })

export function listAdminComandas(params: { status?: ComandaStatus[]; de?: string; ate?: string }) {
  const q = new URLSearchParams()
  params.status?.forEach((s) => q.append('status', s))
  if (params.de) q.set('de', params.de)
  if (params.ate) q.set('ate', params.ate)
  return request<ComandaListItem[]>(`/api/admin/comandas?${q}`, { auth: true })
}
export const reopenComanda = (id: number) => request<Comanda>(`/api/admin/comandas/${id}/reabrir`, { method: 'POST', auth: true })
export const cancelComanda = (id: number, reason?: string) => request<Comanda>(`/api/admin/comandas/${id}/cancelar`, { method: 'POST', json: { reason }, auth: true })

export const getSalesReport = (de: string, ate: string) => request<SalesReport>(`/api/admin/relatorios?de=${de}&ate=${ate}`, { auth: true })
export const downloadSalesSheet = (de: string, ate: string) => request<Blob>(`/api/admin/relatorios/planilha?de=${de}&ate=${ate}`, { auth: true, blob: true })
