import { useEffect, useRef } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onCancel}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-tinta-900/60"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-xl font-extrabold">
          {title}
        </h2>
        <p className="mt-2 text-tinta-700">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
