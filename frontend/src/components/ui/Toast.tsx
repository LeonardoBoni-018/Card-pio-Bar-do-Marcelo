import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error'
interface Toast {
  id: number
  kind: Kind
  message: string
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: Kind, message: string) => {
    const id = nextId++
    setToasts((current) => [...current, { id, kind, message }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000)
  }, [])

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <p
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm font-bold shadow-lg ${t.kind === 'error' ? 'bg-brasa-800 text-white' : 'bg-tinta-900 text-white'}`}
          >
            {t.message}
          </p>
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
