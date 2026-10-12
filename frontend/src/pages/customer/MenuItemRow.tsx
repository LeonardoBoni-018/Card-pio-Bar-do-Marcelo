import { imageSrc } from '../../api/client'
import type { PublicItem } from '../../api/types'
import { formatBRL } from '../../lib/format'
import { MugIcon } from '../../components/MugIcon'

export function ItemPhoto({ item, className }: { item: PublicItem; className: string }) {
  const src = imageSrc(item.imageUrl)
  return src ? (
    <img src={src} alt="" width={160} height={160} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-gradient-to-br from-laranja-500 to-brasa-600 ${className}`} aria-hidden="true">
      <MugIcon className="h-3/5 w-3/5 opacity-90" />
    </div>
  )
}

export function MenuItemRow({ item, onOpen }: { item: PublicItem; onOpen: (item: PublicItem) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`${item.name}, ${formatBRL(item.price)}. Ver detalhes`}
        className="grid w-full grid-cols-[5.5rem_1fr] items-start gap-4 rounded-xl p-2 text-left transition-colors hover:bg-brasa-50"
      >
        <span className="relative block">
          <ItemPhoto item={item} className="h-22 w-22 rounded-xl" />
          {item.featured && (
            <span className="absolute -left-1 -top-1 rounded-md bg-brasa-600 px-2 py-0.5 text-xs font-extrabold text-white">Destaque</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold leading-tight">{item.name}</span>
            <span aria-hidden="true" className="min-w-4 flex-1 border-b-2 border-dotted border-laranja-300" />
            <span className="text-lg font-extrabold tabular-nums text-brasa-700">{formatBRL(item.price)}</span>
          </span>
          {item.description && <span className="mt-1 line-clamp-2 block text-sm leading-snug text-tinta-500">{item.description}</span>}
        </span>
      </button>
    </li>
  )
}
