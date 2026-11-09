import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Ambiente de testes das comandas: o build da branch feature/comandas na Vercel liga a área nova e desliga as
// leituras rápidas (que leem o banco de produção). O /api desse ambiente vai para a API de testes pelo vercel.json
// (regra do host bardomarcelo-teste.vercel.app). Nas outras branches, inclusive a de produção, nada muda.
if (process.env.VERCEL_GIT_COMMIT_REF === 'feature/comandas') {
  process.env.VITE_FEATURE_COMANDAS ??= '1'
  process.env.VITE_FAST_READS ??= '0'
}

// Em desenvolvimento/preview, /api vai para a API local. Em produção quem faz isso é o rewrite do vercel.json.
const apiProxy = {
  '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: { VITE_API_URL: 'http://api.test', VITE_FAST_READS: '0' }, // testes da interface falam só com a API simulada
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/vite-env.d.ts', 'src/test/setup.dom.ts', 'api/**/*.test.ts', 'api/_lib/pgTestDb.ts'],
      thresholds: { lines: 80, statements: 80 },
    },
  },
})
