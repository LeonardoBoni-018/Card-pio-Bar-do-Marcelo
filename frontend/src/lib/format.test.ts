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

describe('parseWeightKg', () => {
  it('aceita kg com vírgula ou ponto, gramas e recusa o resto', async () => {
    const { parseWeightKg } = await import('./format')
    expect(parseWeightKg('0,355')).toBe(0.355)
    expect(parseWeightKg('1.2 kg')).toBe(1.2)
    expect(parseWeightKg('350g')).toBe(0.35)
    expect(parseWeightKg('0')).toBeNull()
    expect(parseWeightKg('0,3555')).toBeNull()
    expect(parseWeightKg('abc')).toBeNull()
  })
})

describe('formatQuantity', () => {
  it('mostra unidades e quilos', async () => {
    const { formatQuantity } = await import('./format')
    expect(formatQuantity(3, 'UNIT')).toBe('3×')
    expect(formatQuantity(0.355, 'KG')).toBe('0,355 kg')
  })
})
