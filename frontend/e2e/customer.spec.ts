import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './helpers'

test.describe('cardápio do cliente', () => {
  test('mostra categorias, itens e preços em reais', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Bar do Marcelo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cervejas' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Porções' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Batata Frita, R\$\s?32,00/ })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Categorias do cardápio' })).toBeVisible()
  })

  test('a busca filtra sem acento e a barra de categorias rola até a seção', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Bebidas' }).waitFor()

    await page.getByRole('button', { name: 'Bebidas' }).click()
    await expect(page.getByRole('heading', { name: 'Bebidas' })).toBeInViewport()

    await page.getByRole('searchbox', { name: 'Buscar no cardápio' }).fill('PORCAO')
    await expect(page.getByRole('heading', { name: 'Cervejas' })).toHaveCount(0)
    await page.getByRole('searchbox').fill('frango')
    await expect(page.getByRole('button', { name: /Frango à Passarinho/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Batata/ })).toHaveCount(0)

    await page.getByRole('searchbox').fill('sushi')
    await expect(page.getByText(/Nenhum item encontrado/)).toBeVisible()
  })

  test('abre os detalhes do item e fecha com Esc', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Chopp/ }).click()

    const dialog = page.getByRole('dialog', { name: 'Chopp' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Copo 300 ml')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('sem rolagem horizontal e sem violações graves de acessibilidade', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Cervejas' }).waitFor()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expectNoA11yViolations(page)
  })

  test('resposta pública da API revalida sempre (no-cache) e traz ETag', async ({ request }) => {
    const response = await request.get('/api/menu')
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['cache-control']).toContain('no-cache')
    expect(response.headers()['etag']).toBeTruthy()
  })
})
