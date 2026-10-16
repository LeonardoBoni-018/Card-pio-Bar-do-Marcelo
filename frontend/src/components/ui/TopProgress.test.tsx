import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopProgress } from './TopProgress'

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
