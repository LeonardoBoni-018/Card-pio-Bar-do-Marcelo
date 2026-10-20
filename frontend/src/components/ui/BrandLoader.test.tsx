import { render, screen } from '@testing-library/react'
import { BrandLoader } from './BrandLoader'
import { Spinner } from './Spinner'

describe('BrandLoader', () => {
  it('anuncia o texto como status e a caneca é decorativa', () => {
    const { container } = render(<BrandLoader label="Carregando itens…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando itens…')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(container.querySelector('img')).toHaveClass('animate-zoom')
  })

  it('silent não cria um segundo "status" (evita anúncio duplicado)', () => {
    render(<BrandLoader silent label="Preparando" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Preparando')).toBeInTheDocument()
  })

  it('Spinner usa o loader da marca e fullscreen ocupa boa parte da tela', () => {
    render(<Spinner label="Abrindo o painel…" fullscreen />)
    expect(screen.getByRole('status')).toHaveClass('min-h-[60dvh]')
  })
})
