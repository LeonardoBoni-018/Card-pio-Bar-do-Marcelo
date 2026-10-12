import { formatBRL, normalize, parsePrice, priceToInput } from './format'

describe('formatBRL', () => {
  it('formata em reais com vírgula', () => {
    expect(formatBRL(8.5).replace(/\s/g, ' ')).toBe('R$ 8,50')
    expect(formatBRL('1234.5').replace(/\s/g, ' ')).toBe('R$ 1.234,50')
  })
})

describe('parsePrice', () => {
  it.each([
    ['8,50', 8.5],
    ['8.50', 8.5],
    ['8', 8],
    ['R$ 12,5', 12.5],
    ['1.234,50', 1234.5],
    ['0', 0],
  ])('aceita %s', (input, expected) => expect(parsePrice(input)).toBe(expected))

  it.each(['', '  ', 'abc', '8,505', '-3', '1,2,3', '8,'])('rejeita "%s"', (input) => expect(parsePrice(input)).toBeNull())
})

describe('priceToInput', () => {
  it('usa vírgula e duas casas', () => expect(priceToInput(8.5)).toBe('8,50'))
})

describe('normalize', () => {
  it('remove acentos e ignora maiúsculas', () => expect(normalize('Pão À Passarinho')).toBe('pao a passarinho'))
})
