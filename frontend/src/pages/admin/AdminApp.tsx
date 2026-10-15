import { Navigate, Route, Routes } from 'react-router'
import { ToastProvider } from '../../components/ui/Toast'
import { AdminLayout } from './AdminLayout'
import CategoriesPage from './CategoriesPage'
import ItemFormPage from './ItemFormPage'
import ItemsPage from './ItemsPage'
import SharePage from './SharePage'
import LoginPage from './LoginPage'
import { RequireAuth } from './RequireAuth'

/** Carregado sob demanda: o cliente que só olha o cardápio nunca baixa este código. */
export default function AdminApp() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="items" replace />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/new" element={<ItemFormPage />} />
            <Route path="items/:id" element={<ItemFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="share" element={<SharePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </ToastProvider>
  )
}
