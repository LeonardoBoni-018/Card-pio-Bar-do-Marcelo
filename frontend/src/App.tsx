import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Spinner } from './components/ui/Spinner'
import { retryDelay, retryPolicy } from './lib/wake'
import MenuPage from './pages/customer/MenuPage'

const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

export function createQueryClient(options: { retryDelay?: (attempt: number) => number } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // insiste enquanto o servidor (plano gratuito) acorda; nunca em erros do cliente (401/403/404...)
        retry: retryPolicy,
        retryDelay: options.retryDelay ?? retryDelay,
        refetchOnWindowFocus: false,
      },
      mutations: { retryDelay: options.retryDelay ?? retryDelay },
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
