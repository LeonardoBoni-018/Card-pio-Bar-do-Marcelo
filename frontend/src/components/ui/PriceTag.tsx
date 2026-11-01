import type { PriceUnit } from '../../api/types'
import { formatBRL } from '../../lib/format'

/** Preço em reais; quando cobrado por quilo mostra "/kg" menor ao lado (ex.: R$ 70,00/kg). */
export function PriceTag({ price, unit, className = '' }: { price: number; unit?: PriceUnit; className?: string }) {
  return (
    <span className={className}>
      {formatBRL(price)}
      {unit === 'KG' && <small className="ml-0.5 text-[0.7em] font-extrabold">/kg</small>}
    </span>
  )
}
