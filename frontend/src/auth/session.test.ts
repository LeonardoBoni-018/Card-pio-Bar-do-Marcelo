import { fakeJwt } from '../test/utils'

async function freshSession() {
  vi.resetModules()
  return (await import('./session')).session
}

describe('session', () => {
  it('guarda o token, notifica quem escuta e persiste no localStorage', async () => {
    const session = await freshSession()
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)

    const token = fakeJwt()
    session.set(token)

    expect(session.getToken()).toBe(token)
    expect(session.getSnapshot()).not.toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('bdm.session')).toContain(token)

    unsubscribe()
    session.clear()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(session.getToken()).toBeNull()
    expect(localStorage.getItem('bdm.session')).toBeNull()
  })

  it('recusa token sem data de validade', async () => {
    const session = await freshSession()
    expect(() => session.set('lixo')).toThrow()
    expect(() => session.set('a.' + btoa('{}') + '.c')).toThrow()
  })

  it('restaura a sessão salva ao recarregar a página', async () => {
    const token = fakeJwt()
    const first = await freshSession()
    first.set(token)
    const second = await freshSession()
    expect(second.getToken()).toBe(token)
  })

  it('ignora sessão salva que já expirou', async () => {
    localStorage.setItem('bdm.session', JSON.stringify({ token: 'x', exp: Math.floor(Date.now() / 1000) - 10 }))
    const session = await freshSession()
    expect(session.getToken()).toBeNull()
  })

  it('ignora lixo no armazenamento', async () => {
    localStorage.setItem('bdm.session', '{nao-e-json')
    const session = await freshSession()
    expect(session.getToken()).toBeNull()
  })

  it('encerra sozinha quando o token expira', async () => {
    vi.useFakeTimers()
    try {
      const session = await freshSession()
      session.set(fakeJwt(30))
      expect(session.getToken()).not.toBeNull()
      vi.advanceTimersByTime(31_000)
      expect(session.getToken()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('expire() limpa e deixa um aviso para a tela de login (lido uma única vez)', async () => {
    const session = await freshSession()
    session.set(fakeJwt())
    session.expire()
    expect(session.getToken()).toBeNull()
    expect(session.consumeExpiredNotice()).toBe(true)
    expect(session.consumeExpiredNotice()).toBe(false)
  })
})
