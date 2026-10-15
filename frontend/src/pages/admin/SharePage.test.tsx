import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn } from '../../test/utils'
import SharePage from './SharePage'

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
})
