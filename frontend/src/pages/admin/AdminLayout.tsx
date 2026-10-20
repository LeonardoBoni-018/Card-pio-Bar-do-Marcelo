import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { session } from '../../auth/session'
import { LogoName } from '../../components/Logo'
import { Icon } from '../../components/ui/Icon'
import { TopProgress } from '../../components/ui/TopProgress'
import { useKeepAlive } from '../../lib/useKeepAlive'

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
          {({ isActive }) => <NavItemContent active={isActive} label="Itens" icon={<Icon name="list" className="size-6" />} />}
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => <NavItemContent active={isActive} label="Categorias" icon={<Icon name="tags" className="size-6" />} />}
        </NavLink>
        <NavLink to="/admin/share" className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => <NavItemContent active={isActive} label="Divulgar" icon={<Icon name="qr" className="size-6" />} />}
        </NavLink>
        <a href="/" target="_blank" rel="noreferrer" className={itemClass(false)}>
          <NavItemContent
            active={false}
            label="Cardápio"
            icon={<Icon name="eye" className="size-6" />}
          />
        </a>
        <button type="button" onClick={logout} className={`${itemClass(false)} md:mt-4`}>
          <NavItemContent
            active={false}
            label="Sair"
            icon={<Icon name="logout" className="size-6" />}
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
