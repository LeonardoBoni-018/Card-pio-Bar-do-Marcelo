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
