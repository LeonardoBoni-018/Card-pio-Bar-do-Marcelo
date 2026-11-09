/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** '0' desliga as leituras públicas pelas Vercel Functions (padrão: ligadas, com volta automática para a API). */
  readonly VITE_FAST_READS?: string
  /** '1' liga a área do garçom (/garcom), ainda em construção. Desligada em produção. */
  readonly VITE_FEATURE_COMANDAS?: string
}
