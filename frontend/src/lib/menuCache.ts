import type { MenuCategory } from '../api/types'

const KEY = 'bdm.menu.v1'

export interface CachedMenu {
  at: number
  data: MenuCategory[]
}

/** Último cardápio visto neste aparelho: aparece na hora enquanto a API acorda. */
export function readMenuCache(): CachedMenu | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedMenu
    return Array.isArray(parsed.data) && typeof parsed.at === 'number' ? parsed : undefined
  } catch {
    return undefined
  }
}

export function writeMenuCache(data: MenuCategory[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data } satisfies CachedMenu))
  } catch {
    /* armazenamento cheio ou indisponível: segue sem cache */
  }
}
