import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn } from '../../test/utils'
import SharePage, { OFFICIAL_URL, publicMenuUrl } from './SharePage'

beforeEach(signIn)
afterEach(() => vi.restoreAllMocks())

describe('SharePage (divulgação)', () => {
  it('mostra o link, gera o QR code com o endereço e libera a impressão', async () => {
    renderApp(<SharePage />)
    expect(screen.getByTestId('link-cardapio')).toHaveTextContent(`${window.location.origin}/`)

    const qr = await screen.findByRole('img', { name: /QR code que abre/ })
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/)

    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir cartaz' })).toBeEnabled())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Imprimir cartaz' }))
    expect(print).toHaveBeenCalled()
  })

  it('copia o link e avisa; se a cópia falhar, orienta copiar à mão', async () => {
    const user = userEvent.setup()
    renderApp(<SharePage />)
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(screen.getByRole('button', { name: 'Copiar link' }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/`)
    expect(await screen.findByText('Link copiado!')).toBeInTheDocument()

    writeText.mockRejectedValue(new Error('negado'))
    await user.click(screen.getByRole('button', { name: 'Copiar link' }))
    expect(await screen.findByText(/Não deu para copiar/)).toBeInTheDocument()
  })

  it('o link divulgado é sempre o domínio oficial (inclusive acessando pelo endereço antigo da Vercel)', () => {
    expect(OFFICIAL_URL).toBe('https://bardomarcelo.com.br/')
    expect(publicMenuUrl('https://bardomarcelo.vercel.app')).toBe(OFFICIAL_URL)
    expect(publicMenuUrl('https://card-pio-bar-do-marcelo-frontend-abc.vercel.app')).toBe(OFFICIAL_URL)
    expect(publicMenuUrl('https://www.bardomarcelo.com.br')).toBe(OFFICIAL_URL)
    expect(publicMenuUrl('https://bardomarcelo.com.br')).toBe(OFFICIAL_URL)
  })

  it('em desenvolvimento local usa o próprio endereço', () => {
    expect(publicMenuUrl('http://localhost:5173')).toBe('http://localhost:5173/')
    expect(publicMenuUrl('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173/')
  })

  it('formato: começa no display deitado, troca para em pé e aceita medida personalizada (lembrando a escolha)', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp(<SharePage />)
    expect(screen.getByRole('radio', { name: /Display de mesa \(deitado\)/ })).toBeChecked()
    expect(screen.getByTestId('cartaz-medida')).toHaveTextContent('deitado · 14 × 10 cm')
    expect(screen.getByLabelText(/Encher a folha A4 \(2 cartões\)/)).toBeChecked()

    await user.click(screen.getByRole('radio', { name: /A6 em pé/ }))
    expect(screen.getByTestId('cartaz-medida')).toHaveTextContent('em pé · 10.5 × 14.8 cm')

    await user.click(screen.getByRole('radio', { name: /Medida personalizada/ }))
    const largura = screen.getByLabelText('Largura (cm)')
    await user.clear(largura)
    await user.type(largura, '16')
    const altura = screen.getByLabelText('Altura (cm)')
    await user.clear(altura)
    await user.type(altura, '9')
    expect(screen.getByTestId('cartaz-medida')).toHaveTextContent('deitado · 16 × 9 cm')
    expect(screen.getByLabelText(/Encher a folha A4 \(3 cartões\)/)).toBeInTheDocument()

    unmount()
    renderApp(<SharePage />)
    expect(screen.getByRole('radio', { name: /Medida personalizada/ })).toBeChecked()
    expect(screen.getByTestId('cartaz-medida')).toHaveTextContent('16 × 9 cm')
  })

  it('medida fora do limite é ajustada para caber na folha', async () => {
    const user = userEvent.setup()
    renderApp(<SharePage />)
    await user.click(screen.getByRole('radio', { name: /Medida personalizada/ }))
    const largura = screen.getByLabelText('Largura (cm)')
    await user.clear(largura)
    await user.type(largura, '50')
    expect(screen.getByTestId('cartaz-medida')).toHaveTextContent('19 × ')
  })
})
