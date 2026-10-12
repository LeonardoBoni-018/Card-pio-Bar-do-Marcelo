import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // os testes compartilham o mesmo banco (H2 em memória da API)
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', locale: 'pt-BR' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /customer\.spec\.ts/ },
  ],
  webServer: [
    {
      // API real com o perfil dev: H2 em memória, dados de exemplo e admin / admin12345
      command: 'mvn -q -f ../backend spring-boot:run -Dspring-boot.run.profiles=dev',
      url: 'http://localhost:8080/actuator/health/liveness',
      timeout: 180_000,
      reuseExistingServer: !CI,
    },
    {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4173',
      timeout: 120_000,
      reuseExistingServer: !CI,
    },
  ],
})
