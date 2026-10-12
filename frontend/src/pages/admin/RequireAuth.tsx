import { Navigate, Outlet, useLocation } from 'react-router'
import { useIsAuthenticated } from '../../auth/session'

export function RequireAuth() {
  const authenticated = useIsAuthenticated()
  const location = useLocation()
  if (!authenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
