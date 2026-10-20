import { BrandLoader } from './BrandLoader'

/** Rodinha de carregamento (decorativa). Herda a cor do texto. */
export function Dot({ className = 'size-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />
}

/** Carregamento de página/seção: a caneca da marca com zoom (veja BrandLoader). */
export function Spinner({ label = 'Carregando…', fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return <BrandLoader label={label} fullscreen={fullscreen} />
}
