export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex animate-fade-up items-center justify-center gap-3 p-10 text-tinta-700">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brasa-100 border-t-brasa-600" aria-hidden="true" />
      <span className="font-semibold">{label}</span>
    </div>
  )
}
