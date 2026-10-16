import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error'
interface Toast {
  id: number
  kind: Kind
  message: string
  leaving: boolean
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1
const MAX_VISIBLE = 3
const LEAVE_MS = 200

const styles: Record<Kind, string> = {
  success: 'bg-tinta-900 text-white',
  error: 'bg-brasa-800 text-white',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  /** Marca para sair (animação) e remove logo depois. */
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), LEAVE_MS)
  }, [])

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++
      setToasts((current) => [...current, { id, kind, message, leaving: false }].slice(-MAX_VISIBLE))
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-lg py-3 pl-4 pr-2 text-sm font-bold shadow-lg ${styles[t.kind]} ${t.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <span aria-hidden="true">{t.kind === 'error' ? '⚠' : '✓'}</span>
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="-my-1 min-h-8 min-w-8 rounded-md text-base leading-none text-white/80 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
