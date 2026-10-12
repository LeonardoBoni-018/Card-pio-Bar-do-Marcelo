import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { session } from '../../auth/session'
import { MugIcon } from '../../components/MugIcon'

const link = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-lg px-4 text-sm font-bold ${isActive ? 'bg-laranja-500 text-tinta-900' : 'text-white hover:bg-white/15'}`

export function AdminLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = () => {
    session.clear()
    queryClient.clear()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-tinta-900 px-4 py-4 text-white md:sticky md:top-0 md:h-screen md:py-6">
        <div className="mb-4 flex items-center gap-3">
          <MugIcon className="h-10 w-10" />
          <div>
            <p className="font-display text-xl leading-none">Bar do Marcelo</p>
            <p className="text-xs text-tinta-300">Painel do proprietário</p>
          </div>
        </div>
        <nav aria-label="Painel" className="flex flex-wrap gap-1 md:flex-col">
          <NavLink to="/admin/items" className={link}>
            Itens do cardápio
          </NavLink>
          <NavLink to="/admin/categories" className={link}>
            Categorias
          </NavLink>
          <a href="/" target="_blank" rel="noreferrer" className={link({ isActive: false })}>
            Ver cardápio (nova aba)
          </a>
          <button type="button" onClick={logout} className={`${link({ isActive: false })} text-left md:mt-6`}>
            Sair
          </button>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
