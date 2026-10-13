import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations, login } from './helpers'

// Foco no celular: sem rolagem lateral, alvos de toque confortáveis, ações ao alcance do polegar.
const MIN_TOUCH = 44

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function expectTouchFriendly(page: Page, locators: ReturnType<Page['locator']>[]) {
  for (const locator of locators) {
    const box = await locator.boundingBox()
    expect(box, 'elemento visível').not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH - 1)
  }
}

test.describe('cliente no celular', () => {
  test('sem rolagem lateral, preço sempre visível e sem link para o painel', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Cervejas' }).waitFor()

    await expectNoHorizontalScroll(page)
    await expect(page.getByRole('link')).toHaveCount(0)
    const viewport = page.viewportSize()!
    for (const row of await page.locator('li button').all()) {
      const box = await row.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    }
    await expectTouchFriendly(page, [page.getByRole('searchbox'), ...(await page.getByRole('navigation', { name: 'Categorias do cardápio' }).getByRole('button').all())])
  })

  test('os detalhes abrem como gaveta colada no rodapé e fecham com o botão', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Chopp/ }).click()

    const dialog = page.getByRole('dialog', { name: 'Chopp' })
    await expect(dialog).toBeVisible()
    const box = (await dialog.boundingBox())!
    const viewport = page.viewportSize()!
    expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(viewport.height - 2) // encostada embaixo
    expect(Math.round(box.width)).toBeGreaterThanOrEqual(viewport.width - 2) // largura total
    await expectTouchFriendly(page, [dialog.getByRole('button', { name: 'Fechar' })])
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialog).toBeHidden()
  })

  test('a barra de categorias fica fixa no topo ao rolar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Bebidas' }).waitFor()
    await page.getByRole('heading', { name: 'Bebidas' }).scrollIntoViewIfNeeded()
    const nav = page.getByRole('navigation', { name: 'Categorias do cardápio' })
    await expect(nav).toBeInViewport()
    expect((await nav.boundingBox())!.y).toBeLessThanOrEqual(2)
  })
})

test.describe('painel no celular', () => {
  test('navegação fixa embaixo, botão flutuante e alvos de toque grandes', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Itens do cardápio' })).toBeVisible()
    await page.getByText('Chopp', { exact: true }).waitFor()

    const nav = page.getByRole('navigation', { name: 'Painel' })
    const viewport = page.viewportSize()!
    const navBox = (await nav.boundingBox())!
    expect(Math.round(navBox.y + navBox.height)).toBeGreaterThanOrEqual(viewport.height - 2) // colada embaixo
    await expectTouchFriendly(page, [
      ...(await nav.getByRole('link').all()),
      nav.getByRole('button', { name: 'Sair' }),
      page.getByRole('link', { name: /Novo item/ }),
      page.getByRole('link', { name: 'Editar Chopp' }),
      page.getByRole('button', { name: 'Excluir Chopp' }),
    ])
    await expectNoHorizontalScroll(page)
    await expectNoA11yViolations(page)
  })

  test('o formulário tem barra de salvar fixa e esconde a navegação para ganhar espaço', async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: /Novo item/ }).click()
    await expect(page.getByRole('heading', { name: 'Novo item' })).toBeVisible()

    await expect(page.getByRole('navigation', { name: 'Painel' })).toBeHidden()
    const save = page.getByRole('button', { name: 'Salvar item' })
    const box = (await save.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    expect(box.y + box.height).toBeGreaterThan(viewport.height - 100) // no rodapé da tela
    await expectTouchFriendly(page, [save, page.getByLabel('Nome'), page.getByLabel('Preço (R$)'), page.getByLabel('Categoria')])
    await expectNoHorizontalScroll(page)
    await expectNoA11yViolations(page)
  })

  test('foto de câmera (grande) é reduzida no aparelho antes do envio', async ({ page }) => {
    await login(page)
    await page.getByRole('link', { name: /Novo item/ }).click()
    await page.getByLabel('Nome').waitFor()

    // gera, dentro do navegador, uma foto de câmera: 4000×3000 com ruído (vários MB)
    const base64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 4000
      canvas.height = 3000
      const ctx = canvas.getContext('2d')!
      const image = ctx.createImageData(4000, 3000)
      for (let i = 0; i < image.data.length; i += 4) {
        image.data[i] = (i * 7) % 255
        image.data[i + 1] = (i * 13) % 255
        image.data[i + 2] = (i * 29) % 255
        image.data[i + 3] = 255
      }
      ctx.putImageData(image, 0, 0)
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.98))
      const buffer = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
      return btoa(binary)
    })
    const original = Buffer.from(base64, 'base64')
    expect(original.length).toBeGreaterThan(5 * 1024 * 1024) // seria recusada pela API sem a redução

    const request = page.waitForRequest((r) => r.url().includes('/api/admin/images') && r.method() === 'POST')
    await page.getByLabel('Foto').setInputFiles({ name: 'IMG_4001.jpg', mimeType: 'image/jpeg', buffer: original })
    const sent = Number((await (await request).allHeaders())['content-length'])
    expect(sent).toBeGreaterThan(0)
    expect(sent).toBeLessThan(1_500_000) // de vários MB para menos de 1,5 MB

    await expect(page.getByRole('button', { name: 'Trocar foto' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
