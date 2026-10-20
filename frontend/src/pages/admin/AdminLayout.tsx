import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { session } from '../../auth/session'
import { LogoName } from '../../components/Logo'
import { TopProgress } from '../../components/ui/TopProgress'
import { useKeepAlive } from '../../lib/useKeepAlive'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

/**
 * Item de navegação. Celular: ícone numa "bolha" que sobe e fica amarela quando ativo, com o nome embaixo.
 * Computador: linha com ícone + nome, e o item ativo ganha fundo amarelo e uma barra vermelha à esquerda.
 */
function NavItemContent({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <>
      {active && <span aria-hidden="true" className="absolute left-0 top-2 hidden h-[calc(100%-1rem)] w-1 rounded-full bg-brasa-600 md:block" />}
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 md:h-auto md:w-auto md:bg-transparent ${
          active ? '-translate-y-0.5 scale-110 bg-sol-300 text-tinta-900 shadow-sm md:translate-y-0 md:scale-100' : 'text-tinta-500 group-hover:text-brasa-700'
        }`}
      >
        {icon}
      </span>
      <span className={`transition-colors ${active ? 'text-brasa-700 md:text-tinta-900' : 'text-tinta-700'}`}>{label}</span>
    </>
  )
}

const itemClass = (active: boolean) =>
  `press group relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-extrabold md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-4 md:text-sm ${
    active ? 'md:bg-sol-300' : 'md:hover:bg-sol-100'
  }`

/**
 * Celular: barra do logo no topo e navegação fixa embaixo, ao alcance do polegar.
 * Computador: menu lateral. Uma única navegação no HTML, só muda a posição.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
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
        <LogoName className="h-9 w-auto md:h-14" />
        <p className="text-sm font-bold text-tinta-500 md:mt-2">Painel do proprietário</p>
      </header>

      <nav
        aria-label="Painel"
        className={`fixed inset-x-0 bottom-0 z-30 grid-cols-5 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_28px_rgba(127,15,25,0.14)] ring-1 ring-brasa-100 md:static md:col-start-1 md:row-start-2 md:flex md:flex-col md:gap-1 md:rounded-none md:border-r md:border-brasa-100 md:p-3 md:pt-3 md:shadow-none md:ring-0 ${isForm ? 'hidden md:flex' : 'grid'}`}
      >
        <span aria-hidden="true" className="awning absolute inset-x-8 top-0 h-1 rounded-b-full md:hidden" />
        <NavLink to="/admin/items" className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => <NavItemContent active={isActive} label="Itens" icon={<Icon><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>} />}
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => <NavItemContent active={isActive} label="Categorias" icon={<Icon><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></Icon>} />}
        </NavLink>
        <NavLink to="/admin/share" className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => <NavItemContent active={isActive} label="Divulgar" icon={<Icon><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M20 20v.01M17 17v3h3" /></Icon>} />}
        </NavLink>
        <a href="/" target="_blank" rel="noreferrer" className={itemClass(false)}>
          <NavItemContent
            active={false}
            label="Cardápio"
            icon={
              <Icon>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </Icon>
            }
          />
        </a>
        <button type="button" onClick={logout} className={`${itemClass(false)} md:mt-4`}>
          <NavItemContent
            active={false}
            label="Sair"
            icon={
              <Icon>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </Icon>
            }
          />
        </button>
      </nav>

      <TopProgress />
      <main className="min-w-0 px-4 pb-32 pt-5 md:col-start-2 md:row-span-2 md:row-start-1 md:overflow-y-auto md:px-8 md:pb-10 md:pt-8">
        {/* a chave refaz a animação de entrada a cada troca de tela (só opacidade: transform quebraria elementos fixed dentro) */}
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
