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
