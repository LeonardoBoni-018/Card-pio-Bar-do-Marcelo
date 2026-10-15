import { menu } from '../test/fixtures'
import { readMenuCache, writeMenuCache } from './menuCache'

describe('menuCache', () => {
  it('guarda e devolve o último cardápio com a hora', () => {
    expect(readMenuCache()).toBeUndefined()
    const before = Date.now()
    writeMenuCache(menu)
    const cached = readMenuCache()!
    expect(cached.data).toEqual(menu)
    expect(cached.at).toBeGreaterThanOrEqual(before)
  })

  it('ignora lixo no armazenamento', () => {
    localStorage.setItem('bdm.menu.v1', '{quebrado')
    expect(readMenuCache()).toBeUndefined()
    localStorage.setItem('bdm.menu.v1', JSON.stringify({ at: 'ontem', data: 'x' }))
    expect(readMenuCache()).toBeUndefined()
  })

  it('não quebra se o armazenamento estiver cheio ou bloqueado', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeMenuCache(menu)).not.toThrow()
    vi.restoreAllMocks()
  })
})
