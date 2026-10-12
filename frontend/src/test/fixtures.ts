import type { AdminItem, Category, MenuCategory, Page } from '../api/types'

export const menu: MenuCategory[] = [
  {
    id: 1,
    name: 'Cervejas',
    items: [
      { id: 1, name: 'Cerveja Long Neck', description: 'Bem gelada · 355 ml', price: 9, imageUrl: '/api/images/a.jpg', featured: true },
      { id: 2, name: 'Chopp', description: 'Copo 300 ml', price: 8.5, imageUrl: null, featured: false },
    ],
  },
  {
    id: 2,
    name: 'Porções',
    items: [{ id: 3, name: 'Calabresa Acebolada', description: 'Calabresa com cebola e pão', price: 36, imageUrl: null, featured: false }],
  },
]

export const categories: Category[] = [
  { id: 1, name: 'Cervejas', displayOrder: 1 },
  { id: 2, name: 'Porções', displayOrder: 2 },
]

export const adminItem = (overrides: Partial<AdminItem> = {}): AdminItem => ({
  id: 1,
  name: 'Chopp',
  description: 'Copo 300 ml',
  price: 8.5,
  imageFilename: null,
  imageUrl: null,
  available: true,
  featured: false,
  categoryId: 1,
  categoryName: 'Cervejas',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const page = (content: AdminItem[], overrides: Partial<Page<AdminItem>> = {}): Page<AdminItem> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  ...overrides,
})
