import { useState } from 'react'
import { publicImageSrc } from '../../api/client'
import type { PublicItem } from '../../api/types'
import { LogoMark } from '../../components/Logo'
import { formatBRL } from '../../lib/format'

export function ItemPhoto({ item, className, thumb = false }: { item: PublicItem; className: string; thumb?: boolean }) {
  const [fastFailed, setFastFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const src = publicImageSrc(item.imageUrl, thumb ? 'thumb' : undefined, !fastFailed)
  return src ? (
    <img
      // imagens já em cache terminam de carregar antes do onLoad ser registrado
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) setLoaded(true)
      }}
      src={src}
      onLoad={() => setLoaded(true)}
      onError={() => setFastFailed(true)}
      alt=""
      width={192}
      height={192}
      loading="lazy"
      decoding="async"
      className={`bg-sol-100 object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  ) : (
    <div className={`flex items-center justify-center bg-sol-100 ${className}`} aria-hidden="true">
      <LogoMark className="h-4/5 w-4/5 object-contain" />
    </div>
  )
}

/**
 * Linha do cardápio. No celular: foto à esquerda; nome, descrição e preço empilhados (preço sempre visível, sem quebrar).
 * Em telas maiores: nome ····· preço na primeira linha, como num cardápio impresso.
 */
export function MenuItemRow({ item, onOpen, index = 0 }: { item: PublicItem; onOpen: (item: PublicItem) => void; index?: number }) {
  return (
    // entrada escalonada só nos primeiros itens, para não atrasar listas longas
    <li className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`${item.name}, ${formatBRL(item.price)}. Ver detalhes`}
        className="grid w-full grid-cols-[6rem_1fr] items-start gap-4 rounded-2xl bg-white p-3 text-left ring-1 ring-brasa-100 transition duration-150 active:scale-[0.99] active:bg-brasa-50 sm:bg-transparent sm:ring-0 sm:hover:bg-brasa-50"
      >
        <ItemPhoto item={item} thumb className="size-24 rounded-xl" />
        <span className="grid min-w-0 grid-cols-1 content-start gap-y-1 sm:grid-cols-[auto_1fr_auto] sm:gap-x-3">
          <span className="order-1 text-lg font-extrabold leading-tight">
            {item.featured && <span className="mb-1 mr-2 inline-block rounded bg-sol-500 px-2 py-0.5 align-middle text-xs font-extrabold text-tinta-900">Destaque</span>}
            {item.name}
          </span>
          <span aria-hidden="true" className="order-2 mb-1.5 hidden self-end border-b-2 border-dotted border-laranja-300 sm:block" />
          <span className="order-3 text-xl font-extrabold tabular-nums text-brasa-700 sm:text-lg">{formatBRL(item.price)}</span>
          {item.description && (
            <span className="order-2 line-clamp-2 text-sm leading-snug text-tinta-500 sm:order-4 sm:col-span-3">{item.description}</span>
          )}
        </span>
      </button>
    </li>
  )
}
