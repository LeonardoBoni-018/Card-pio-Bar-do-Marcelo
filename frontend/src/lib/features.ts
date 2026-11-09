/**
 * Chaves de funcionalidades em construção. Tudo começa desligado no build de produção;
 * em `npm run dev` o arquivo .env.development liga o que está sendo desenvolvido.
 */
export function comandasEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_COMANDAS === '1'
}
