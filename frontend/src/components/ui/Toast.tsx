import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: Kind
  message: string
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1
const MAX_VISIBLE = 3
const DURATION: Record<Kind, number> = { success: 4000, info: 5000, error: 7000 }

const STYLE: Record<Kind, { box: string; icon: string; path: string }> = {
  success: { box: 'bg-tinta-900 text-white', icon: 'bg-sol-500 text-tinta-900', path: 'M5 13l4 4L19 7' },
  info: { box: 'bg-tinta-900 text-white', icon: 'bg-laranja-500 text-tinta-900', path: 'M12 8h.01M11 12h1v5h1' },
  error: { box: 'bg-brasa-800 text-white', icon: 'bg-white text-brasa-800', path: 'M12 7v6M12 17h.01' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++
      // no máximo 3 avisos na tela: o mais antigo sai quando chega um novo
      setToasts((current) => [...current, { id, kind, message }].slice(-MAX_VISIBLE))
      setTimeout(() => dismiss(id), DURATION[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* no celular fica acima da barra de navegação fixa */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-xl py-2.5 pl-3 pr-1.5 shadow-xl ${STYLE[t.kind].box}`}
          >
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${STYLE[t.kind].icon}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d={STYLE[t.kind].path} />
              </svg>
            </span>
            <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="press flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold opacity-80 hover:bg-white/10 hover:opacity-100"
            >
              <span aria-hidden="true">×</span>
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
