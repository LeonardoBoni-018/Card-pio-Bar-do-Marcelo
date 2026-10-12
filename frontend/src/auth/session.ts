import { useSyncExternalStore } from 'react'

const KEY = 'bdm.session'

interface Session {
  token: string
  exp: number // segundos desde a época, como no JWT
}

function readExp(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Session
    return stored.exp * 1000 > Date.now() ? stored : null
  } catch {
    return null
  }
}

let current: Session | null = load()
let expiredNotice = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function scheduleExpiry() {
  clearTimeout(timer)
  if (!current) return
  const ms = Math.min(current.exp * 1000 - Date.now(), 2 ** 31 - 1)
  timer = setTimeout(() => session.clear(), Math.max(ms, 0))
}

/** Sessão do proprietário: o JWT fica no localStorage e some sozinho quando expira. */
export const session = {
  getToken(): string | null {
    return current?.token ?? null
  },
  set(token: string): void {
    const exp = readExp(token)
    if (exp === null) throw new Error('Token inválido')
    current = { token, exp }
    try {
      localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      /* armazenamento indisponível (modo privado): a sessão vale só nesta aba */
    }
    scheduleExpiry()
    emit()
  },
  /** Chamado quando a API recusa o token (401): a próxima tela de login explica o motivo. */
  expire(): void {
    expiredNotice = true
    session.clear()
  },
  consumeExpiredNotice(): boolean {
    const value = expiredNotice
    expiredNotice = false
    return value
  },
  clear(): void {
    current = null
    clearTimeout(timer)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignorar */
    }
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): Session | null {
    return current
  },
}

scheduleExpiry()

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(session.subscribe, session.getSnapshot) !== null
}
