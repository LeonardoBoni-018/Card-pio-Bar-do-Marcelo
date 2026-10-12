import { menu } from '../test/fixtures'
import { filterMenu } from './menu'

describe('filterMenu', () => {
  it('sem busca devolve o cardápio inteiro', () => {
    expect(filterMenu(menu, '')).toBe(menu)
    expect(filterMenu(menu, '   ')).toBe(menu)
  })

  it('busca por nome ou descrição, sem acento e sem diferenciar maiúsculas', () => {
    expect(filterMenu(menu, 'CALABRESA').map((c) => c.name)).toEqual(['Porções'])
    expect(filterMenu(menu, 'pao').map((c) => c.items[0].name)).toEqual(['Calabresa Acebolada'])
    expect(filterMenu(menu, 'gelada')[0].items.map((i) => i.name)).toEqual(['Cerveja Long Neck'])
  })

  it('exige todas as palavras e esconde categorias sem resultado', () => {
    expect(filterMenu(menu, 'copo chopp')[0].items).toHaveLength(1)
    expect(filterMenu(menu, 'copo calabresa')).toEqual([])
  })
})
