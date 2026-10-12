import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ApiError } from './api/client'
import { Spinner } from './components/ui/Spinner'
import MenuPage from './pages/customer/MenuPage'

const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // não insiste em erros do cliente (401/403/404/422...); tenta de novo só falhas de rede/servidor
        retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MenuPage />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<Spinner label="Abrindo painel…" />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<MenuPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
