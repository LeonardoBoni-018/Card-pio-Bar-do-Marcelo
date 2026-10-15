import { ApiError } from '../api/client'

/**
 * No plano gratuito do Render a API "dorme" após 15 min sem acesso e leva ~70 s para acordar. Nesse tempo o proxy
 * responde 502/503/504 (ou a conexão cai). Isso não é erro de verdade: vale esperar e tentar de novo.
 */
export const isServerWaking = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504)

const isServerError = (error: unknown): boolean => error instanceof ApiError && error.status >= 500

const MAX_WAKE_ATTEMPTS = 12 // ~2-3 minutos no total, sobra para os ~70 s de partida

/** Política de novas tentativas das consultas: insiste enquanto o servidor acorda, nunca em erros 4xx. */
export function retryPolicy(failureCount: number, error: unknown): boolean {
  if (isServerWaking(error) || isServerError(error)) return failureCount < MAX_WAKE_ATTEMPTS
  if (error instanceof ApiError) return false // 4xx: o pedido está errado, repetir não adianta
  return failureCount < 2
}

/** Espera crescente entre tentativas: 2 s, 4 s, ... até 10 s. */
export const retryDelay = (attempt: number): number => Math.min(2000 + attempt * 2000, 10_000)

/** Só para ações idempotentes e seguras de repetir (ex.: login): insiste apenas quando o servidor está acordando. */
export const retryOnlyWhileWaking = (failureCount: number, error: Error): boolean =>
  isServerWaking(error) && failureCount < MAX_WAKE_ATTEMPTS
