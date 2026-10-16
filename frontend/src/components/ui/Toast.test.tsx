import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { ToastProvider, useToast } from './Toast'

function Trigger() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Salvo!')}>ok</button>
      <button onClick={() => toast.error('Deu ruim')}>erro</button>
    </>
  )
}

afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('mostra o aviso e o fecha pelo botão', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'ok' }))
    expect(screen.getByRole('status')).toHaveTextContent('Salvo!')

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    await vi.waitFor(() => expect(screen.queryByText('Salvo!')).not.toBeInTheDocument())
  })

  it('some sozinho depois de alguns segundos', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'erro' }).click())
    expect(screen.getByRole('alert')).toHaveTextContent('Deu ruim')
    act(() => void vi.advanceTimersByTime(7300))
    expect(screen.queryByText('Deu ruim')).not.toBeInTheDocument()
  })

  it('mantém no máximo 3 avisos na tela', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    for (let i = 0; i < 5; i++) act(() => screen.getByRole('button', { name: 'ok' }).click())
    expect(screen.getAllByRole('status')).toHaveLength(3)
  })
})

describe('Button loading', () => {
  it('fica desabilitado e marcado como ocupado, sem mudar o nome acessível', () => {
    render(<Button loading>Salvar</Button>)
    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
