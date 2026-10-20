import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/** Padrões de medidas do app: cartões, cabeçalhos e blocos usam sempre estas classes. */
export const cardClass = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brasa-100 sm:p-5'

/** Cabeçalho de página do painel: ícone em bolha amarela + título + descrição + ação à direita. */
export function PageHeader({ icon, title, subtitle, action }: { icon: IconName; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sol-300 text-tinta-900 shadow-sm" aria-hidden="true">
        <Icon name={icon} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-tinta-500 sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** Título de bloco dentro de um cartão (ex.: "Foto", "Dados do item"). */
export function CardTitle({ icon, children, id }: { icon: IconName; children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-lg font-extrabold">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brasa-50 text-brasa-700" aria-hidden="true">
        <Icon name={icon} className="size-5" />
      </span>
      {children}
    </h2>
  )
}
