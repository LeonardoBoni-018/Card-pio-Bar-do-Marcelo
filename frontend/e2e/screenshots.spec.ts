import { devices, expect, test } from '@playwright/test'
import { login } from './helpers'

// Gera as imagens de docs/screenshots. Rode com: npm run screenshots
test.skip(!process.env.SCREENSHOTS, 'defina SCREENSHOTS=1 para gerar as capturas')

const OUT = '../docs/screenshots'

test('capturas do cardápio do cliente (celular e computador)', async ({ browser }) => {
  const mobile = await browser.newContext({ ...devices['Pixel 5'], locale: 'pt-BR' })
  const m = await mobile.newPage()
  await m.goto('/')
  await m.getByRole('heading', { name: 'Cervejas' }).waitFor()
  await m.screenshot({ path: `${OUT}/cliente-celular.png` })
  await m.screenshot({ path: `${OUT}/cliente-celular-completo.png`, fullPage: true })
  await m.getByRole('button', { name: /Batata Frita/ }).click()
  await expect(m.getByRole('dialog')).toBeVisible()
  await m.screenshot({ path: `${OUT}/cliente-celular-detalhe.png` })
  await mobile.close()

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'pt-BR' })
  const d = await desktop.newPage()
  await d.goto('/')
  await d.getByRole('heading', { name: 'Cervejas' }).waitFor()
  await d.screenshot({ path: `${OUT}/cliente-computador.png` })
  await desktop.close()
})

test('capturas do painel do proprietário', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto('/admin/login')
  await page.getByRole('heading', { name: 'Área do proprietário' }).waitFor()
  await page.screenshot({ path: `${OUT}/admin-login.png` })

  await login(page)
  await page.getByText('Chopp', { exact: true }).waitFor()
  await page.getByRole('switch', { name: 'Disponível: Suco Natural' }).click()
  await page.getByText(/saiu do cardápio/).waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${OUT}/admin-itens.png` })

  await page.getByRole('link', { name: 'Editar Batata Frita' }).click()
  await page.getByLabel('Nome').waitFor()
  await page.screenshot({ path: `${OUT}/admin-editar-item.png` })
  await page.getByLabel('Preço (R$)').fill('abc')
  await page.getByRole('button', { name: 'Salvar item' }).click()
  await page.getByText(/Preço inválido/).waitFor()
  await page.screenshot({ path: `${OUT}/admin-erro-validacao.png` })

  const phone = await browser.newContext({ ...devices['Pixel 5'], locale: 'pt-BR' })
  const p = await phone.newPage()
  await login(p)
  await p.getByText('Chopp', { exact: true }).waitFor()
  await p.screenshot({ path: `${OUT}/admin-itens-celular.png` })
  await phone.close()
  await context.close()
})
