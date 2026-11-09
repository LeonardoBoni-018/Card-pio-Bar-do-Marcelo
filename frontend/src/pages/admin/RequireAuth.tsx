import { Navigate, Outlet, useLocation } from 'react-router'
import { useSessionUser, type Role } from '../../auth/session'

interface RequireAuthProps {
  /** Perfis que podem ver estas telas (padrão: só o proprietário). */
  roles?: Role[]
  loginPath?: string
}

export function RequireAuth({ roles = ['ADMIN'], loginPath = '/admin/login' }: RequireAuthProps) {
  const user = useSessionUser()
  const location = useLocation()
  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />
  }
  // garçom que cai no painel vai para a área dele (o painel é só do proprietário)
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'GARCOM' ? '/garcom' : '/admin'} replace />
  return <Outlet />
}
