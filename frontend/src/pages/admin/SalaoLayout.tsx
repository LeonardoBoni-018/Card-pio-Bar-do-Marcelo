import { NavLink, Outlet } from 'react-router'
import { Icon, type IconName } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/Layout'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: 'mesas', label: 'Mesas', icon: 'store' },
  { to: 'garcons', label: 'Garçons', icon: 'user' },
]

/** Salão: cadastros do módulo de comandas, em abas (Mesas, Garçons; depois Comandas e Relatórios). */
export function SalaoLayout() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader icon="store" title="Salão" subtitle="Mesas e garçons que usam as comandas." />
      <nav aria-label="Salão" className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-brasa-100">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors ${
                isActive ? 'bg-sol-300 text-tinta-900 shadow-sm' : 'text-tinta-700 hover:bg-sol-100'
              }`
            }
          >
            <Icon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
