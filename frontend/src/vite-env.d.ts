/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** '0' desliga as leituras públicas pelas Vercel Functions (padrão: ligadas, com volta automática para a API). */
  readonly VITE_FAST_READS?: string
}
