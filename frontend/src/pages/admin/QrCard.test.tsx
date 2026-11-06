import { render, screen } from '@testing-library/react'
import { copiesPerSheet, orientationOf, PRESETS, PrintSheet, QrCard } from './QrCard'

describe('cartaz do QR code', () => {
  it('o formato padrão é o display de mesa deitado (14 × 10 cm)', () => {
    expect(PRESETS[0]).toMatchObject({ orientation: 'horizontal', widthCm: 14, heightCm: 10 })
  })

  it('orientação vem da medida: mais largo que alto = deitado', () => {
    expect(orientationOf(14, 10)).toBe('horizontal')
    expect(orientationOf(10, 15)).toBe('vertical')
  })

  it.each([
    [14, 10, 2], // 1 coluna × 2 linhas numa A4 (19 × 27,7 cm úteis)
    [9, 6, 8], // 2 × 4
    [10.5, 14.8, 1],
    [19, 27.7, 1],
  ])('cabem %s × %s cm → %i por folha', (w, h, n) => {
    expect(copiesPerSheet({ widthCm: w, heightCm: h })).toBe(n)
  })

  it('o cartão leva o tamanho real em cm (para a impressão) e a proporção na prévia', () => {
    const { container } = render(<QrCard qr="data:image/png;base64,x" link="https://bardomarcelo.com.br/" size={{ orientation: 'horizontal', widthCm: 14, heightCm: 10 }} />)
    const card = container.querySelector('.cartaz') as HTMLElement
    expect(card.style.getPropertyValue('--cartaz-w')).toBe('14cm')
    expect(card.style.getPropertyValue('--cartaz-h')).toBe('10cm')
    expect(card.style.aspectRatio).toBe('14 / 10')
    expect(card.dataset.orientation).toBe('horizontal')
    expect(screen.getByRole('img', { name: 'QR code que abre https://bardomarcelo.com.br/' })).toBeInTheDocument()
    expect(screen.getByText('bardomarcelo.com.br')).toBeInTheDocument()
  })

  it('a folha de impressão repete o cartão e fica escondida de leitores de tela', () => {
    render(<PrintSheet qr="data:image/png;base64,x" link="https://bardomarcelo.com.br/" size={{ orientation: 'horizontal', widthCm: 14, heightCm: 10 }} copies={2} />)
    const sheet = document.body.querySelector('.folha-impressao') as HTMLElement
    expect(sheet.parentElement).toBe(document.body)
    expect(sheet).toHaveAttribute('aria-hidden', 'true')
    expect(sheet.querySelectorAll('.cartaz')).toHaveLength(2)
    expect(screen.queryByRole('img')).toBeNull()
  })
})
