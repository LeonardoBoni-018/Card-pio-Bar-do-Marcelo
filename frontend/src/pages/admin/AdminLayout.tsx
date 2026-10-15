import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router'
import { session } from '../../auth/session'
import { LogoName } from '../../components/Logo'
import { useKeepAlive } from '../../lib/useKeepAlive'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const itemClass = (active: boolean) =>
  `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-bold md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-4 md:text-sm ${
    active ? 'bg-sol-300 text-tinta-900' : 'text-tinta-700 active:bg-brasa-50 md:hover:bg-brasa-50'
  }`

/**
 * Celular: barra do logo no topo e navegação fixa embaixo, ao alcance do polegar.
 * Computador: menu lateral. Uma única navegação no HTML, só muda a posição.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useKeepAlive()
  const isForm = Boolean(useMatch('/admin/items/:id')) // /new também casa; o formulário tem barra de salvar própria

  const logout = () => {
    session.clear()
    queryClient.clear()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[15rem_1fr] md:grid-rows-[auto_1fr] md:overflow-hidden">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-brasa-100 bg-white px-4 md:static md:col-start-1 md:row-start-1 md:block md:h-auto md:border-r md:px-5 md:py-6">
        <LogoName className="h-9 w-auto md:h-16" />
        <p className="text-sm font-bold text-tinta-500 md:mt-2">Painel do proprietário</p>
      </header>

      <nav
        aria-label="Painel"
        className={`fixed inset-x-0 bottom-0 z-30 grid-cols-5 border-t border-brasa-100 bg-white pb-[env(safe-area-inset-bottom)] md:static md:col-start-1 md:row-start-2 md:flex md:flex-col md:gap-1 md:border-r md:border-t-0 md:p-3 ${isForm ? 'hidden md:flex' : 'grid'}`}
      >
        <NavLink to="/admin/items" className={({ isActive }) => itemClass(isActive)}>
          <Icon>
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </Icon>
          Itens
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => itemClass(isActive)}>
          <Icon>
            <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
            <path d="M7.5 7.5h.01" />
          </Icon>
          Categorias
        </NavLink>
        <NavLink to="/admin/share" className={({ isActive }) => itemClass(isActive)}>
          <Icon>
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M20 20v.01M17 17v3h3" />
          </Icon>
          Divulgar
        </NavLink>
        <a href="/" target="_blank" rel="noreferrer" className={itemClass(false)}>
          <Icon>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </Icon>
          Cardápio
        </a>
        <button type="button" onClick={logout} className={`${itemClass(false)} md:mt-4`}>
          <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </Icon>
          Sair
        </button>
      </nav>

      <main className="min-w-0 px-4 pb-28 pt-5 md:col-start-2 md:row-span-2 md:row-start-1 md:overflow-y-auto md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>
    </div>
  )
}
