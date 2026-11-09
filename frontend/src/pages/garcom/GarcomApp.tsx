import { Navigate, Route, Routes } from 'react-router'
import { ToastProvider } from '../../components/ui/Toast'
import LoginPage from '../admin/LoginPage'
import { RequireAuth } from '../admin/RequireAuth'
import { GarcomLayout } from './GarcomLayout'
import ServiceTablesPage from './ServiceTablesPage'

/**
 * Área do garçom (/garcom), atrás da chave VITE_FEATURE_COMANDAS. O proprietário também pode abrir.
 * Escopo e etapas: docs/comandas/ESCOPO.md
 */
export default function GarcomApp() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<LoginPage variant="garcom" />} />
        <Route element={<RequireAuth roles={['GARCOM', 'ADMIN']} loginPath="/garcom/login" />}>
          <Route element={<GarcomLayout />}>
            <Route index element={<ServiceTablesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/garcom" replace />} />
      </Routes>
    </ToastProvider>
  )
}
