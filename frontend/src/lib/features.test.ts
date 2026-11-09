import { comandasEnabled } from './features'

afterEach(() => vi.unstubAllEnvs())

describe('comandasEnabled', () => {
  it('fica desligada sem a variável', () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '')
    expect(comandasEnabled()).toBe(false)
  })

  it('liga só com "1"', () => {
    vi.stubEnv('VITE_FEATURE_COMANDAS', '1')
    expect(comandasEnabled()).toBe(true)
    vi.stubEnv('VITE_FEATURE_COMANDAS', 'true')
    expect(comandasEnabled()).toBe(false)
  })
})
