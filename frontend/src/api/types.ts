/** Como o preço é cobrado: por unidade/porção (padrão) ou por quilo. */
export type PriceUnit = 'UNIT' | 'KG'

export interface PublicItem {
  id: number
  name: string
  description: string
  price: number
  /** Ausente em respostas antigas (= por unidade). */
  priceUnit?: PriceUnit
  imageUrl: string | null
  featured: boolean
}

export interface MenuCategory {
  id: number
  name: string
  items: PublicItem[]
}

export interface Category {
  id: number
  name: string
  displayOrder: number
}

export interface AdminItem {
  id: number
  name: string
  description: string
  price: number
  priceUnit?: PriceUnit
  imageFilename: string | null
  imageUrl: string | null
  available: boolean
  featured: boolean
  categoryId: number
  categoryName: string
  updatedAt: string
}

export interface ItemInput {
  name: string
  description: string
  price: number
  priceUnit: PriceUnit
  categoryId: number
  imageFilename: string | null
  available: boolean
  featured: boolean
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface ItemSearch {
  q?: string
  categoryId?: number
  page?: number
  size?: number
}

/** Mesa do salão (comandas). */
export interface DiningTable {
  id: number
  name: string
  displayOrder: number
  active: boolean
}

export interface TableInput {
  name: string
  displayOrder?: number
  active?: boolean
}

/** Garçom cadastrado pelo proprietário (a senha nunca volta da API). */
export interface Waiter {
  id: number
  name: string
  username: string
  active: boolean
}

export interface WaiterInput {
  name: string
  username: string
  /** Obrigatória ao criar; vazia ao editar = mantém a atual. */
  password?: string
  active?: boolean
}

/** Resumo de comanda aberta (cartões da tela de mesas do garçom). */
export interface ComandaSummary {
  id: number
  label: string | null
  total: number
  itemCount: number
  openedBy: string
  openedAt: string
  version: number
}

/** Mesa vista pelo garçom, com as comandas abertas. */
export interface TableOverview extends DiningTable {
  openTotal: number
  comandas: ComandaSummary[]
}

export type ComandaStatus = 'OPEN' | 'CLOSED' | 'CANCELED' | 'MERGED'

export interface ComandaItem {
  id: number
  menuItemId: number | null
  name: string
  unitPrice: number
  priceUnit: PriceUnit
  quantity: number
  lineTotal: number
  note: string | null
  custom: boolean
  addedBy: string
  addedAt: string
}

export interface Comanda {
  id: number
  tableId: number
  tableName: string
  label: string | null
  status: ComandaStatus
  people: number | null
  subtotal: number
  discount: number
  total: number
  openedBy: string
  openedAt: string
  updatedAt: string
  version: number
  mergedInto: number | null
  closedBy?: string | null
  closedAt?: string | null
  canceledBy?: string | null
  canceledAt?: string | null
  cancelReason?: string | null
  reopenedCount?: number
  items: ComandaItem[]
}

/** Linha da lista de comandas do proprietário. */
export interface ComandaListItem {
  id: number
  tableName: string
  label: string | null
  status: ComandaStatus
  total: number
  itemCount: number
  openedBy: string
  openedAt: string
  closedBy: string | null
  closedAt: string | null
  cancelReason: string | null
}

export interface ServiceMenuItem {
  id: number
  name: string
  price: number
  priceUnit: PriceUnit
  available: boolean
}

export interface ServiceMenuCategory {
  id: number
  name: string
  items: ServiceMenuItem[]
}

/** Lançar item: do cardápio (menuItemId) ou avulso (name + unitPrice). */
export interface AddItemInput {
  menuItemId?: number
  name?: string
  unitPrice?: number
  quantity: number
  note?: string
}
