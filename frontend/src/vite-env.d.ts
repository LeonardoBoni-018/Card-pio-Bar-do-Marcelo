/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** '1' liga as leituras públicas pelas Vercel Functions (com volta automática para a API). */
  readonly VITE_FAST_READS?: string
}
