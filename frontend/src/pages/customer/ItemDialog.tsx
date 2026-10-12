import { useEffect, useRef } from 'react'
import type { PublicItem } from '../../api/types'
import { formatBRL } from '../../lib/format'
import { ItemPhoto } from './MenuItemRow'

export function ItemDialog({ item, onClose }: { item: PublicItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  return (
    <dialog
      ref={ref}
      aria-labelledby="item-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose() // clique no fundo escurecido
      }}
      className="m-auto w-[min(94vw,28rem)] overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-tinta-900/65"
    >
      {item && (
        <div>
          <ItemPhoto item={item} className="aspect-[4/3] w-full" />
          <div className="p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="item-dialog-title" className="text-2xl font-extrabold leading-tight">
                {item.name}
              </h2>
              <p className="text-2xl font-extrabold tabular-nums text-brasa-700">{formatBRL(item.price)}</p>
            </div>
            {item.description && <p className="mt-3 text-tinta-700">{item.description}</p>}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-11 w-full rounded-lg bg-brasa-600 px-4 py-2.5 font-bold text-white hover:bg-brasa-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
