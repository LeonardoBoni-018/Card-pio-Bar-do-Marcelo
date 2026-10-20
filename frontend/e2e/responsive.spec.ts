import { expect, test, type Page } from '@playwright/test'
import { esperarAnimacoes, expectNoA11yViolations, login } from './helpers'

// Matriz de tamanhos de tela: celulares pequenos e grandes, tablets (retrato e paisagem), notebooks e monitores.
export const TELAS = [
  { nome: 'celular-320x568', width: 320, height: 568 },
  { nome: 'celular-360x640', width: 360, height: 640 },
  { nome: 'celular-375x667', width: 375, height: 667 },
  { nome: 'celular-390x844', width: 390, height: 844 },
  { nome: 'celular-412x915', width: 412, height: 915 },
  { nome: 'celular-430x932', width: 430, height: 932 },
  { nome: 'celular-paisagem-844x390', width: 844, height: 390 },
  { nome: 'tablet-600x960', width: 600, height: 960 },
  { nome: 'tablet-768x1024', width: 768, height: 1024 },
  { nome: 'tablet-820x1180', width: 820, height: 1180 },
  { nome: 'tablet-paisagem-1024x768', width: 1024, height: 768 },
  { nome: 'tablet-paisagem-1180x820', width: 1180, height: 820 },
  { nome: 'notebook-1280x720', width: 1280, height: 720 },
  { nome: 'notebook-1366x768', width: 1366, height: 768 },
  { nome: 'desktop-1536x864', width: 1536, height: 864 },
  { nome: 'desktop-1920x1080', width: 1920, height: 1080 },
  { nome: 'monitor-2560x1440', width: 2560, height: 1440 },
] as const

const OUT = process.env.SHOTS_DIR

async function semEstouro(page: Page) {
  const dados = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth
    const estouros = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const estilo = getComputedStyle(el)
        return r.width > 0 && estilo.position !== 'fixed' && (r.right > largura + 1 || r.left < -1) && !el.closest('[data-scroll-x], nav[aria-label="Categorias do cardápio"] > div, .sr-only')
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
    return { rolagem: document.documentElement.scrollWidth - largura, estouros }
  })
  expect(dados.rolagem, `rolagem lateral; elementos: ${dados.estouros.join(' | ')}`).toBeLessThanOrEqual(0)
  expect(dados.estouros, `elementos fora da tela: ${dados.estouros.join(' | ')}`).toEqual([])
}

async function foto(page: Page, nome: string) {
  await esperarAnimacoes(page)
  if (OUT) await page.screenshot({ path: `${OUT}/${nome}.png`, fullPage: false })
}

for (const tela of TELAS) {
  test.describe(tela.nome, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } })

    test('cardápio do cliente', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('heading', { name: 'Cervejas' }).waitFor()
      await semEstouro(page)
      await expect(page.getByRole('img', { name: /Bar do Marcelo/ })).toBeVisible()
      await foto(page, `${tela.nome}-cliente`)
      await page.getByRole('button', { name: /Chopp/ }).click()
      const dialog = page.getByRole('dialog', { name: 'Chopp' })
      await expect(dialog).toBeVisible()
      await esperarAnimacoes(page)
      const caixa = (await dialog.boundingBox())!
      expect(caixa.x).toBeGreaterThanOrEqual(-1)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(tela.width + 1)
      expect(caixa.y + caixa.height).toBeLessThanOrEqual(tela.height + 1) // o botão Fechar nunca fica fora da tela
      await foto(page, `${tela.nome}-detalhe`)
      await dialog.getByRole('button', { name: 'Fechar' }).click()
      await expectNoA11yViolations(page)
    })

    test('painel do proprietário', async ({ page }) => {
      await page.goto('/admin/login')
      await semEstouro(page)
      await foto(page, `${tela.nome}-login`)
      await login(page)
      await expect(page.getByRole('heading', { name: 'Itens do cardápio' })).toBeVisible()
      await foto(page, `${tela.nome}-itens`)
      await semEstouro(page)
      for (const [link, titulo] of [
        ['Categorias', 'Categorias'],
        ['Divulgar', 'Divulgar o cardápio'],
      ] as const) {
        await page.getByRole('link', { name: link, exact: true }).click()
        await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
        await semEstouro(page)
        await foto(page, `${tela.nome}-${link.toLowerCase()}`)
        if (link === 'Categorias') {
          // nenhum texto da lista de categorias pode ficar cortado ou sobreposto a outro
          await esperarAnimacoes(page)
          for (const linha of await page.locator('main ul > li').all()) {
            const nome = (await linha.locator('p').first().boundingBox())!
            const posicao = (await linha.getByText(/^Posição \d+/).boundingBox())!
            const sobrepoe = nome.x < posicao.x + posicao.width && posicao.x < nome.x + nome.width && nome.y < posicao.y + posicao.height && posicao.y < nome.y + nome.height
            expect(sobrepoe, 'nome sobreposto à posição').toBe(false)
            const cortado = await linha.locator('p').first().evaluate((el) => el.scrollWidth > el.clientWidth + 1)
            expect(cortado, 'nome cortado').toBe(false)
          }
        }
      }
      await page.goto('/admin/items/new')
      await expect(page.getByRole('heading', { name: 'Novo item' })).toBeVisible()
      await semEstouro(page)
      const salvar = page.getByRole('button', { name: 'Salvar item' })
      await expect(salvar).toBeVisible()
      await esperarAnimacoes(page)
      const b = (await salvar.boundingBox())!
      expect(b.y + b.height).toBeLessThanOrEqual(tela.height + 1) // salvar sempre alcançável
      await foto(page, `${tela.nome}-formulario`)
    })
  })
}
