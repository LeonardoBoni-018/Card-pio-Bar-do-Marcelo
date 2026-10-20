import logoMark from '../../assets/logo-mark.webp'

const SIZES = { sm: 'size-20', md: 'size-28', lg: 'size-36' } as const

interface BrandLoaderProps {
  label?: string
  size?: keyof typeof SIZES
  /** Ocupa uma boa parte da tela (abrir o painel, primeira carga do cardápio). */
  fullscreen?: boolean
  /** Não anuncia nada a leitores de tela (quando já existe um aviso de "carregando" em volta). */
  silent?: boolean
}

/**
 * Carregamento com a caneca da marca: ela dá zoom (cresce e encolhe, balançando de leve) sobre ondas amarelas e
 * laranjas que se espalham. Só movimento de transform/opacidade (leve); "reduzir movimento" deixa tudo parado.
 */
export function BrandLoader({ label = 'Carregando…', size = 'md', fullscreen = false, silent = false }: BrandLoaderProps) {
  return (
    <div role={silent ? undefined : 'status'} className={`flex animate-fade-in flex-col items-center justify-center gap-4 p-8 ${fullscreen ? 'min-h-[60dvh]' : ''}`}>
      <div className={`relative grid place-items-center ${SIZES[size]}`} aria-hidden="true">
        <span className="absolute inset-0 animate-ripple rounded-full bg-sol-300/70" />
        <span className="absolute inset-0 animate-ripple rounded-full bg-laranja-500/40 [animation-delay:0.9s]" />
        <span className="absolute inset-[12%] rounded-full bg-sol-100 ring-2 ring-sol-500" />
        <img src={logoMark} alt="" width={320} height={203} className="relative w-[72%] animate-zoom drop-shadow-sm" />
      </div>
      <p className="text-center text-base font-extrabold text-tinta-700">{label}</p>
    </div>
  )
}
