import { ApiError } from '../api/client'
import { isServerWaking, retryDelay, retryOnlyWhileWaking, retryPolicy } from './wake'

describe('isServerWaking', () => {
  it.each([0, 502, 503, 504])('status %i é servidor acordando', (status) => expect(isServerWaking(new ApiError(status, 'x'))).toBe(true))
  it.each([400, 401, 404, 429, 500])('status %i não é', (status) => expect(isServerWaking(new ApiError(status, 'x'))).toBe(false))
  it('erros que não são da API também não', () => expect(isServerWaking(new Error('x'))).toBe(false))
})

describe('retryPolicy', () => {
  it('erro 4xx nunca é repetido', () => expect(retryPolicy(0, new ApiError(404, 'x'))).toBe(false))
  it('erro 5xx e servidor acordando são repetidos até o limite', () => {
    expect(retryPolicy(11, new ApiError(504, 'x'))).toBe(true)
    expect(retryPolicy(12, new ApiError(504, 'x'))).toBe(false)
    expect(retryPolicy(3, new ApiError(500, 'x'))).toBe(true)
  })
  it('erro desconhecido tem só 2 tentativas', () => {
    expect(retryPolicy(1, new Error('x'))).toBe(true)
    expect(retryPolicy(2, new Error('x'))).toBe(false)
  })
})

describe('retryOnlyWhileWaking', () => {
  it('só repete quando o servidor está acordando', () => {
    expect(retryOnlyWhileWaking(0, new ApiError(503, 'x'))).toBe(true)
    expect(retryOnlyWhileWaking(0, new ApiError(500, 'x'))).toBe(false)
    expect(retryOnlyWhileWaking(0, new ApiError(401, 'senha errada'))).toBe(false)
    expect(retryOnlyWhileWaking(12, new ApiError(503, 'x'))).toBe(false)
  })
})

describe('retryDelay', () => {
  it('cresce e é limitado a 10 s', () => {
    expect(retryDelay(0)).toBe(2000)
    expect(retryDelay(2)).toBe(6000)
    expect(retryDelay(50)).toBe(10_000)
  })
})
