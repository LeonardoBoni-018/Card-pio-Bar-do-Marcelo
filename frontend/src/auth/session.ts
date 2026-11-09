import { useSyncExternalStore } from 'react'

const KEY = 'bdm.session'

/** Perfil de quem entrou: proprietário (painel) ou garçom (comandas). */
export type Role = 'ADMIN' | 'GARCOM'

export interface Session {
  token: string
  exp: number // segundos desde a época, como no JWT
  role: Role
  /** Nome para exibir ("Olá, João"). */
  name: string
}

interface Claims {
  exp?: number
  sub?: string
  name?: string
  roles?: string[]
}

function readClaims(token: string): Claims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Claims
  } catch {
    return null
  }
}

/** Lê validade, perfil e nome do próprio token (a API é quem confere a assinatura e o perfil de verdade). */
function fromToken(token: string): Session | null {
  const claims = readClaims(token)
  if (!claims || typeof claims.exp !== 'number') return null
  const role: Role = claims.roles?.includes('GARCOM') ? 'GARCOM' : 'ADMIN'
  return { token, exp: claims.exp, role, name: claims.name || claims.sub || '' }
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Pick<Session, 'token'>
    const restored = typeof stored.token === 'string' ? fromToken(stored.token) : null
    return restored && restored.exp * 1000 > Date.now() ? restored : null
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

/** Sessão (proprietário ou garçom): o JWT fica no localStorage e some sozinho quando expira. */
export const session = {
  getToken(): string | null {
    return current?.token ?? null
  },
  set(token: string): void {
    const parsed = fromToken(token)
    if (parsed === null) throw new Error('Token inválido')
    current = parsed
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

/** Quem está logado (perfil e nome), ou null. */
export function useSessionUser(): Pick<Session, 'role' | 'name'> | null {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  return snapshot ? { role: snapshot.role, name: snapshot.name } : null
}
