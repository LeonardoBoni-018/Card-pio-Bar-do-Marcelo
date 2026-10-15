// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const query = vi.fn(async () => [{ ok: 1 }])
const neon = vi.fn(() => ({ query }))
vi.mock('@neondatabase/serverless', () => ({ neon }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  neon.mockClear()
  query.mockClear()
})

describe('getSql', () => {
  it('sem MENU_DATABASE_URL falha com mensagem clara (nunca tenta conectar)', async () => {
    vi.stubEnv('MENU_DATABASE_URL', '')
    const { getSql } = await import('./db')
    expect(() => getSql()).toThrow('MENU_DATABASE_URL')
    expect(neon).not.toHaveBeenCalled()
  })

  it('cria o cliente uma vez só e repassa texto e parâmetros', async () => {
    vi.stubEnv('MENU_DATABASE_URL', 'postgresql://leitura:x@host/db')
    const { getSql } = await import('./db')
    const sql = getSql()
    expect(await sql('select $1', [1])).toEqual([{ ok: 1 }])
    getSql()
    expect(neon).toHaveBeenCalledTimes(1)
    expect(neon).toHaveBeenCalledWith('postgresql://leitura:x@host/db')
    expect(query).toHaveBeenCalledWith('select $1', [1])
    await sql('select 2')
    expect(query).toHaveBeenLastCalledWith('select 2', [])
  })
})
