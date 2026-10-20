import type { IconName } from '../components/ui/Icon'
import { normalize } from './format'

const RULES: Array<[RegExp, IconName]> = [
  [/cerveja|chopp|chope|long ?neck|pilsen|lata/, 'beer'],
  [/drink|drinque|caipirinha|coquetel|batida|dose|destilado|whisk|vodka|cachaca|gin/, 'cocktail'],
  [/refri|suco|agua|energetico|bebida|soda|cha|cafe/, 'drink'],
  [/sobremesa|doce|sorvete|pudim|bolo|acai/, 'dessert'],
  [/porc|petisco|lanche|prato|refeicao|almoco|janta|marmita|salgado|pastel|frito|carne|espet|burger|hamburguer|pizza|acompanh/, 'food'],
  [/mercearia|produto|garrafa|vinho/, 'bottle'],
]

/** Escolhe o ícone da categoria pelo nome (ex.: "Cervejas" → caneca, "Porções" → talheres). */
export function categoryIcon(name: string): IconName {
  const text = normalize(name)
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 'tag'
}
