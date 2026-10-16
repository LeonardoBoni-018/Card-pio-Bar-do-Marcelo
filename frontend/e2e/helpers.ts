import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** PNG 2x2 válido, só para testar o envio de foto. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAr7GoOkAAAAASUVORK5CYII=',
  'base64',
)

/** Espera as animações e transições finitas acabarem (as infinitas, como esqueleto e rodinha, são ignoradas). */
export const esperarAnimacoes = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState === 'finished' || a.playState === 'idle'), undefined, { timeout: 5000 })

export async function expectNoA11yViolations(page: Page) {
  // animações de entrada (opacidade) alteram o contraste medido: espera terminarem
  await esperarAnimacoes(page)
  const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, serious.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target}) ${v.nodes[0]?.any[0]?.message ?? ""} ${String(v.nodes[0]?.html).slice(0, 220)}`).join('\n')).toEqual([])
}

export async function login(page: Page, username = 'admin', password = 'admin12345') {
  await page.goto('/admin/login')
  await page.getByLabel('Usuário').fill(username)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
