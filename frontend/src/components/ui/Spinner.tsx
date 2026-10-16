/** Rodinha de carregamento (decorativa). Herda a cor do texto. */
export function Dot({ className = 'size-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex animate-fade-in items-center justify-center gap-3 p-10 text-tinta-700">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brasa-100 border-t-brasa-600" aria-hidden="true" />
      <span className="font-semibold">{label}</span>
    </div>
  )
}
