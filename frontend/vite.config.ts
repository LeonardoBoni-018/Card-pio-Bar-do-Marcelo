import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

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
    env: { VITE_API_URL: 'http://api.test' },
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/vite-env.d.ts'],
      thresholds: { lines: 80, statements: 80 },
    },
  },
})
