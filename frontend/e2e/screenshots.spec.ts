import { devices, expect, test } from '@playwright/test'
import { login } from './helpers'

// Gera as imagens de docs/screenshots. Rode com: npm run screenshots
test.skip(!process.env.SCREENSHOTS, 'defina SCREENSHOTS=1 para gerar as capturas')

const OUT = '../docs/screenshots'
const phone = { ...devices['Pixel 5'], locale: 'pt-BR' }
const desktop = { viewport: { width: 1280, height: 800 }, locale: 'pt-BR' }

test('cliente (celular e computador)', async ({ browser }) => {
  const m = await (await browser.newContext(phone)).newPage()
  await m.goto('/')
  await m.getByRole('heading', { name: 'Cervejas' }).waitFor()
  await m.screenshot({ path: `${OUT}/cliente-celular.png` })
  await m.evaluate(() => window.scrollTo(0, 520))
  await m.waitForTimeout(300)
  await m.screenshot({ path: `${OUT}/cliente-celular-rolando.png` })
  await m.getByRole('button', { name: /Batata Frita/ }).click()
  await expect(m.getByRole('dialog')).toBeVisible()
  await m.screenshot({ path: `${OUT}/cliente-celular-detalhe.png` })

  const d = await (await browser.newContext(desktop)).newPage()
  await d.goto('/')
  await d.getByRole('heading', { name: 'Cervejas' }).waitFor()
  await d.screenshot({ path: `${OUT}/cliente-computador.png` })
})

test('painel do proprietário (celular e computador)', async ({ browser }) => {
  const m = await (await browser.newContext(phone)).newPage()
  await m.goto('/admin/login')
  await m.getByRole('heading', { name: 'Área do proprietário' }).waitFor()
  await m.screenshot({ path: `${OUT}/admin-login-celular.png` })
  await login(m)
  await m.getByText('Chopp', { exact: true }).waitFor()
  await m.screenshot({ path: `${OUT}/admin-itens-celular.png` })
  await m.getByRole('link', { name: 'Editar Batata Frita' }).click()
  await m.getByLabel('Nome', { exact: true }).waitFor()
  await m.screenshot({ path: `${OUT}/admin-formulario-celular.png` })
  await m.goto('/admin/categories')
  await m.getByText('Cervejas', { exact: true }).waitFor()
  await m.screenshot({ path: `${OUT}/admin-categorias-celular.png` })

  const d = await (await browser.newContext(desktop)).newPage()
  await login(d)
  await d.getByText('Chopp', { exact: true }).waitFor()
  await d.screenshot({ path: `${OUT}/admin-itens-computador.png` })
  await d.getByRole('link', { name: 'Editar Batata Frita' }).click()
  await d.getByLabel('Nome', { exact: true }).waitFor()
  await d.screenshot({ path: `${OUT}/admin-formulario-computador.png` })
})
