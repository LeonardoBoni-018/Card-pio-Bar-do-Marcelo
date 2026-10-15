import { session } from '../auth/session'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  json?: unknown
  form?: FormData
  /** Envia o token do proprietário e trata 401 como sessão expirada. */
  auth?: boolean
  signal?: AbortSignal
}

const FRIENDLY: Record<number, string> = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurou.',
  413: 'O arquivo é grande demais. Use uma foto de até 5 MB.',
  429: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.auth) {
    const token = session.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let body: BodyInit | undefined
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  } else if (options.form) {
    body = options.form
  }

  let response: Response
  try {
    response = await fetch(BASE + path, { method: options.method ?? 'GET', headers, body, signal: options.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.')
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  let detail: string | undefined
  let fieldErrors: Record<string, string> = {}
  try {
    const problem = (await response.json()) as { detail?: string; errors?: Record<string, string> }
    detail = problem.detail
    fieldErrors = problem.errors ?? {}
  } catch {
    /* corpo vazio ou não-JSON */
  }
  if (response.status === 401 && options.auth) {
    session.expire()
  }
  const waking = response.status === 502 || response.status === 503 || response.status === 504
  const message = waking
    ? 'O servidor está acordando. Isso leva cerca de 1 minuto; aguarde um pouco e tente de novo.'
    : response.status >= 500
      ? 'O servidor teve um problema. Tente novamente em instantes.'
      : (detail ?? FRIENDLY[response.status] ?? 'Algo deu errado.')
  throw new ApiError(response.status, message, fieldErrors)
}

/** URL completa de uma foto (a API devolve caminhos relativos como /api/images/xxx.jpg). `thumb` pede a miniatura leve (listas). */
export function imageSrc(url: string | null | undefined, size?: 'thumb'): string | null {
  if (!url) return null
  return BASE + url + (size === 'thumb' ? '?size=thumb' : '')
}

/** Leituras públicas pelas Vercel Functions (sempre acordadas): ligadas por padrão, com volta automática; VITE_FAST_READS=0 desliga. */
export const fastReadsEnabled = (): boolean => import.meta.env.VITE_FAST_READS !== '0'

/** Foto do cardápio público: pela função da Vercel quando ligada (/api/fast/images/..); senão, direto da API. */
export function publicImageSrc(url: string | null | undefined, size?: 'thumb', useFast = true): string | null {
  if (!url) return null
  const path = useFast && fastReadsEnabled() ? url.replace(/^\/api\/images\//, '/api/fast/images/') : url
  return BASE + path + (size === 'thumb' ? '?size=thumb' : '')
}
