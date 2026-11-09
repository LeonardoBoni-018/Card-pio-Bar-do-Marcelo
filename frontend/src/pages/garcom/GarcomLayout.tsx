import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from 'react-router'
import { session, useSessionUser } from '../../auth/session'
import { LogoName } from '../../components/Logo'
import { Icon } from '../../components/ui/Icon'
import { TopProgress } from '../../components/ui/TopProgress'
import { useKeepAlive } from '../../lib/useKeepAlive'

/** Celular primeiro: barra fixa com o logo, quem está logado e Sair; conteúdo em coluna única. */
export function GarcomLayout() {
  const user = useSessionUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useKeepAlive()

  const logout = () => {
    session.clear()
    queryClient.clear()
    navigate('/garcom/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-brasa-50/40">
      <header className="sticky top-0 z-30 border-b border-brasa-100 bg-white">
        <div className="awning h-1.5" aria-hidden="true" />
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <LogoName className="h-8 w-auto" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-tinta-700">{user?.name ? `Olá, ${user.name}` : 'Comandas'}</p>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="press rounded-lg px-2 py-2 text-sm font-bold text-brasa-700">
              Painel
            </Link>
          )}
          <button type="button" onClick={logout} className="press flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-tinta-700 hover:bg-sol-100">
            <Icon name="logout" />
            Sair
          </button>
        </div>
      </header>
      <TopProgress />
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <Outlet />
      </main>
    </div>
  )
}
