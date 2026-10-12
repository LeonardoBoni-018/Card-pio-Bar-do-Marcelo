import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { session } from '../auth/session'
import { ToastProvider } from '../components/ui/Toast'

export const API = 'http://api.test'

/** JWT de mentira (sem assinatura válida) só com o `exp`, que é o que o front lê. */
export function fakeJwt(expiresInSeconds = 3600): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + expiresInSeconds })}.assinatura`
}

export const signIn = () => session.set(fakeJwt())

export function renderApp(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}
