import { Button } from './ui/Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-brasa-100">
      <h2 className="text-xl font-extrabold text-brasa-700">Não foi possível carregar</h2>
      <p className="mt-2 text-tinta-700">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  )
}
