import { useEffect, useRef } from 'react'
import type { PublicItem } from '../../api/types'
import { formatBRL } from '../../lib/format'
import { ItemPhoto } from './MenuItemRow'

/** No celular abre como uma "gaveta" colada embaixo (fácil de fechar com o polegar); em telas maiores, centralizado. */
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
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl p-0 shadow-2xl backdrop:bg-tinta-900/60 sm:m-auto sm:w-[min(94vw,28rem)] sm:rounded-2xl"
    >
      {item && (
        <div>
          <ItemPhoto item={item} className="aspect-[4/3] w-full" />
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="item-dialog-title" className="text-2xl font-extrabold leading-tight">
                {item.name}
              </h2>
              <p className="rounded-lg bg-sol-100 px-2 text-2xl font-extrabold tabular-nums text-brasa-700 ring-1 ring-sol-500">{formatBRL(item.price)}</p>
            </div>
            {item.description && <p className="mt-3 text-lg leading-snug text-tinta-700">{item.description}</p>}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-12 w-full rounded-xl bg-brasa-600 px-4 py-3 text-base font-bold text-white active:bg-brasa-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
