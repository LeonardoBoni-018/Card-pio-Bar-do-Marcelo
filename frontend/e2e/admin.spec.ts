import { expect, test } from '@playwright/test'
import { TINY_PNG, expectNoA11yViolations, login } from './helpers'

const ITEM = `Pudim do Marcelo ${Date.now() % 100000}`

test.describe('painel do proprietário', () => {
  test('rotas do painel exigem login', async ({ page }) => {
    await page.goto('/admin/items')
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByRole('heading', { name: 'Área do proprietário' })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('senha errada mostra o erro e não entra', async ({ page }) => {
    await login(page, 'admin', 'senha-errada')
    await expect(page.getByRole('alert')).toContainText('Usuário ou senha inválidos.')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('fluxo completo: criar categoria e item com foto, ver no cardápio, ocultar, editar e excluir', async ({ page, context }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Itens do cardápio' })).toBeVisible()
    await expectNoA11yViolations(page)

    // categoria nova
    await page.getByRole('link', { name: 'Categorias' }).click()
    await page.getByLabel('Nova categoria').fill('Sobremesas')
    await page.getByRole('button', { name: 'Adicionar' }).click()
    await expect(page.getByText('Categoria “Sobremesas” criada.')).toBeVisible()

    // item novo com foto
    await page.getByRole('link', { name: 'Itens', exact: true }).click()
    await page.getByRole('link', { name: /Novo item/ }).click()
    await page.getByLabel('Nome').fill(ITEM)
    await page.getByLabel('Descrição').fill('Pudim de leite condensado com calda de caramelo')
    await page.getByLabel('Preço (R$)').fill('12,9')
    await page.getByLabel('Categoria').selectOption({ label: 'Sobremesas' })
    await page.getByLabel('Foto').setInputFiles({ name: 'pudim.png', mimeType: 'image/png', buffer: TINY_PNG })
    await expect(page.getByRole('button', { name: 'Trocar foto' })).toBeVisible()
    await expectNoA11yViolations(page)
    await page.getByRole('button', { name: 'Salvar item' }).click()
    await expect(page.getByText(`“${ITEM}” foi adicionado ao cardápio.`)).toBeVisible()
    await expect(page.getByText(ITEM, { exact: true })).toBeVisible()

    // aparece no cardápio público (outra aba, sem login) com a foto carregada
    const publicPage = await context.newPage()
    await publicPage.goto('/')
    const row = publicPage.getByRole('button', { name: new RegExp(`${ITEM}, R\\$\\s?12,90`) })
    await expect(row).toBeVisible()
    await expect(row.locator('img')).toHaveJSProperty('complete', true)
    expect(await row.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

    // ocultar: some do cardápio na hora
    await page.getByRole('switch', { name: `Disponível: ${ITEM}` }).click()
    await expect(page.getByText(/saiu do cardápio/)).toBeVisible()
    await publicPage.reload()
    await expect(publicPage.getByRole('heading', { name: 'Cervejas' })).toBeVisible()
    await expect(publicPage.getByRole('button', { name: new RegExp(ITEM) })).toHaveCount(0)

    // reativar e editar o preço
    await page.getByRole('switch', { name: `Disponível: ${ITEM}` }).click()
    await expect(page.getByText(/voltou ao cardápio/)).toBeVisible()
    await page.getByRole('link', { name: `Editar ${ITEM}` }).click()
    await expect(page.getByLabel('Preço (R$)')).toHaveValue('12,90')
    await expect(page.getByLabel('Categoria')).toHaveValue(/\d+/)
    await page.getByLabel('Preço (R$)').fill('14,50')
    await page.getByRole('button', { name: 'Salvar item' }).click()
    await expect(page.getByText(`“${ITEM}” foi atualizado.`)).toBeVisible()
    await publicPage.reload()
    await expect(publicPage.getByRole('button', { name: new RegExp(`${ITEM}, R\\$\\s?14,50`) })).toBeVisible()

    // categoria com item não pode ser excluída
    await page.getByRole('link', { name: 'Categorias' }).click()
    await page.getByRole('button', { name: 'Excluir Sobremesas' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(/possui itens/)).toBeVisible()

    // excluir o item (com confirmação) e depois a categoria
    await page.getByRole('link', { name: 'Itens', exact: true }).click()
    await page.getByRole('button', { name: `Excluir ${ITEM}` }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(`“${ITEM}” foi excluído.`)).toBeVisible()
    await publicPage.reload()
    await expect(publicPage.getByRole('button', { name: new RegExp(ITEM) })).toHaveCount(0)

    await page.getByRole('link', { name: 'Categorias' }).click()
    await page.getByRole('button', { name: 'Excluir Sobremesas' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText('Categoria excluída.')).toBeVisible()
  })

  test('a sessão sobrevive ao recarregar e termina ao sair', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Itens do cardápio' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Itens do cardápio' })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
    await page.goto('/admin/items')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('divulgação: QR code, link e acessibilidade (cores novas)', async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: 'Divulgar' }).click()
    await expect(page.getByRole('heading', { name: 'Divulgar o cardápio' })).toBeVisible()
    await expect(page.getByRole('img', { name: /QR code que abre/ })).toBeVisible()
    await expectNoA11yViolations(page)
    await page.getByRole('link', { name: 'Itens' }).click()
    await expectNoA11yViolations(page)
  })

  test('admin da API recusa chamadas sem token', async ({ request }) => {
    expect((await request.get('/api/admin/items')).status()).toBe(401)
  })
})
