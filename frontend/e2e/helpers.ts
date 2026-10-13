import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** PNG 2x2 válido, só para testar o envio de foto. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAr7GoOkAAAAASUVORK5CYII=',
  'base64',
)

export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious, serious.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`).join('\n')).toEqual([])
}

export async function login(page: Page, username = 'admin', password = 'admin12345') {
  await page.goto('/admin/login')
  await page.getByLabel('Usuário').fill(username)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
