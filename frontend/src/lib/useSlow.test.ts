import { act, renderHook } from '@testing-library/react'
import { useSlow } from './useSlow'

describe('useSlow', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('vira true só depois do tempo, e volta a false quando termina', () => {
    const { result, rerender } = renderHook(({ active }) => useSlow(active, 3000), { initialProps: { active: true } })
    expect(result.current).toBe(false)
    act(() => void vi.advanceTimersByTime(2999))
    expect(result.current).toBe(false)
    act(() => void vi.advanceTimersByTime(2))
    expect(result.current).toBe(true)

    rerender({ active: false })
    expect(result.current).toBe(false)
  })

  it('se terminar antes do tempo, nunca vira true', () => {
    const { result, rerender } = renderHook(({ active }) => useSlow(active, 3000), { initialProps: { active: true } })
    act(() => void vi.advanceTimersByTime(1000))
    rerender({ active: false })
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current).toBe(false)
  })
})
