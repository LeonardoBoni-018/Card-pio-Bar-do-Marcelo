import { renderHook } from '@testing-library/react'
import { useKeepAlive } from './useKeepAlive'

describe('useKeepAlive', () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response('[]')))

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('chama a API a cada 8 minutos enquanto a aba está visível', () => {
    renderHook(() => useKeepAlive())
    vi.advanceTimersByTime(7 * 60_000)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]).toEqual(['http://api.test/api/ping', { cache: 'no-store' }])
    vi.advanceTimersByTime(8 * 60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('não chama com a aba escondida (economiza o plano gratuito) e para ao sair', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const { unmount } = renderHook(() => useKeepAlive())
    vi.advanceTimersByTime(30 * 60_000)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    unmount()
    vi.advanceTimersByTime(30 * 60_000)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignora falhas da chamada', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('offline')))
    renderHook(() => useKeepAlive())
    vi.advanceTimersByTime(8 * 60_000)
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
