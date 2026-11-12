import type { PriceUnit } from '../api/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number | string): string {
  return brl.format(Number(value))
}

/** Texto curto do sufixo de cobrança: "" (unidade) ou "/kg". */
export const unitSuffix = (unit?: PriceUnit): string => (unit === 'KG' ? '/kg' : '')

/** Preço por extenso para leitores de tela e textos: "R$ 70,00 o quilo" ou só "R$ 9,00". */
export const formatPriceText = (value: number | string, unit?: PriceUnit): string => formatBRL(value) + (unit === 'KG' ? ' o quilo' : '')

/** Converte "8,5", "8.50", "R$ 1.234,50" em número; devolve null se não for um preço válido (até 2 casas). */
export function parsePrice(input: string): number | null {
  let text = input.replace(/R\$|\s/g, '')
  if (!text) return null
  text = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  return Number(text)
}

export function priceToInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** Minúsculas e sem acentos, para busca ("pão" encontra "PAO"). */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Converte peso digitado ("0,355", "1.2", "350g") em kg com até 3 casas; null se inválido ou zero. */
export function parseWeightKg(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/\s/g, '')
  if (!text) return null
  const grams = /^(\d{1,6})g$/.exec(text)
  if (grams) {
    const kg = Number(grams[1]) / 1000
    return kg > 0 && kg <= 999 ? kg : null
  }
  const normalized = text.replace(/kg$/, '').replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(normalized)) return null
  const kg = Number(normalized)
  return kg > 0 ? kg : null
}

/** Quantidade como o garçom fala: "3×" ou "0,355 kg". */
export function formatQuantity(quantity: number, unit?: PriceUnit): string {
  if (unit === 'KG') return `${quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
  return `${quantity}×`
}
