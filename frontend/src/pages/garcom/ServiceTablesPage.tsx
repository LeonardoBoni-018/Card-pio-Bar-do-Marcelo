import { useServiceTables } from '../../api/queries'
import { ErrorState } from '../../components/ErrorState'
import { Icon } from '../../components/ui/Icon'
import { cardClass, PageHeader } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { formatBRL } from '../../lib/format'

/** Mesas ativas. Etapa 1: só a lista; na etapa 2 cada mesa abre as comandas dela. */
export default function ServiceTablesPage() {
  const tables = useServiceTables()

  return (
    <div className="space-y-5">
      <PageHeader icon="store" title="Mesas" subtitle="Escolha a mesa para lançar os pedidos." />

      <p role="note" className="flex items-start gap-2 rounded-xl bg-sol-100 px-3 py-2 text-sm font-semibold text-tinta-900 ring-1 ring-sol-500">
        <Icon name="info" className="mt-0.5 size-4" />
        Em teste: as telas para abrir comandas e lançar itens chegam na próxima etapa.
      </p>

      {tables.isPending && <Spinner label="Carregando mesas…" />}
      {tables.isError && <ErrorState message={tables.error.message} onRetry={() => void tables.refetch()} />}
      {tables.data?.length === 0 && (
        <p className={`${cardClass} py-8 text-center text-tinta-700`}>
          <Icon name="store" className="mx-auto mb-2 size-8 text-brasa-700" />
          Nenhuma mesa cadastrada. Peça ao proprietário para cadastrar no painel (Salão → Mesas).
        </p>
      )}
      {tables.data && tables.data.length > 0 && (
        <ul aria-label="Mesas" className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4">
          {tables.data.map((table) => {
            const count = table.comandas?.length ?? 0
            return (
              <li
                key={table.id}
                className={`${cardClass} flex min-h-24 flex-col items-center justify-center gap-1 text-center ${count > 0 ? 'ring-2 ring-laranja-500' : ''}`}
              >
                <span className="break-words text-lg font-extrabold leading-tight">{table.name}</span>
                {count === 0 ? (
                  <span className="rounded-full bg-brasa-50 px-2 py-0.5 text-xs font-bold text-tinta-700">Livre</span>
                ) : (
                  <>
                    <span className="rounded-full bg-sol-300 px-2 py-0.5 text-xs font-bold text-tinta-900">{count === 1 ? '1 comanda' : `${count} comandas`}</span>
                    <span className="text-sm font-extrabold text-tinta-900">{formatBRL(table.openTotal)}</span>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
