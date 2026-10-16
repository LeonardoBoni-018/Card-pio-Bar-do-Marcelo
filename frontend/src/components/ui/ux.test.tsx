import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { ToastProvider, useToast } from './Toast'
import { TopProgress } from './TopProgress'

function Demo() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Salvo!')}>ok</button>
      <button onClick={() => toast.error('Falhou')}>erro</button>
      <button onClick={() => toast.info('Dica')}>info</button>
    </>
  )
}

describe('Toast', () => {
  it('mostra aviso, fecha no ×, e some sozinho depois do tempo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    )
    await user.click(screen.getByText('ok'))
    expect(screen.getByRole('status')).toHaveTextContent('Salvo!')
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByText('Salvo!')).toBeNull()

    await user.click(screen.getByText('erro'))
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
    act(() => void vi.advanceTimersByTime(7100))
    expect(screen.queryByText('Falhou')).toBeNull()
    vi.useRealTimers()
  })

  it('mantém no máximo 3 avisos (o mais antigo sai)', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    )
    await user.click(screen.getByText('ok'))
    await user.click(screen.getByText('info'))
    await user.click(screen.getByText('erro'))
    await user.click(screen.getByText('ok'))
    expect(screen.getAllByRole('button', { name: 'Fechar aviso' })).toHaveLength(3)
    expect(screen.queryByText('Dica')).toBeInTheDocument()
    expect(screen.getAllByText('Salvo!')).toHaveLength(1) // o primeiro "Salvo!" foi descartado
  })
})

describe('Button loading', () => {
  it('desabilita, marca aria-busy e mantém o texto', () => {
    render(<Button loading>Salvar</Button>)
    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('sem loading fica normal', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })
})

describe('TopProgress', () => {
  function Slow() {
    const m = useMutation({ mutationFn: () => new Promise<void>((resolve) => setTimeout(resolve, 600)) })
    return <button onClick={() => m.mutate()}>go</button>
  }

  it('aparece só se a operação demorar e some ao terminar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TopProgress />
        <Slow />
      </QueryClientProvider>,
    )
    expect(screen.queryByTestId('top-progress')).toBeNull()
    await user.click(screen.getByText('go'))
    act(() => void vi.advanceTimersByTime(100))
    expect(screen.queryByTestId('top-progress')).toBeNull() // resposta rápida não pisca
    act(() => void vi.advanceTimersByTime(300))
    expect(screen.getByTestId('top-progress')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(400))
    await vi.waitFor(() => expect(screen.queryByTestId('top-progress')).toBeNull())
    vi.useRealTimers()
  })
})
