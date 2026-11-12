import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Rodapé fixo (botões de ação). */
  footer?: ReactNode
}

/** Janela que no celular sobe de baixo (gaveta, ao alcance do polegar) e no computador fica centralizada. */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="gaveta m-0 mt-auto max-h-[92dvh] w-full max-w-none flex-col rounded-t-3xl p-0 shadow-2xl backdrop:bg-tinta-900/60 open:flex sm:m-auto sm:w-[min(94vw,32rem)] sm:rounded-2xl"
    >
      <div className="flex items-center gap-3 border-b border-brasa-100 px-5 py-3">
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-lg font-extrabold">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="press flex size-11 items-center justify-center rounded-full text-tinta-700 hover:bg-sol-100">
          <Icon name="close" />
        </button>
      </div>
      {open && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
      {open && footer && <div className="border-t border-brasa-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </dialog>
  )
}
