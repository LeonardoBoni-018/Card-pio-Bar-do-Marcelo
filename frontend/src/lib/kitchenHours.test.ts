import { kitchenStatus } from './kitchenHours'

// BRT = UTC−3 (sem horário de verão). 2026-11-03 é uma terça-feira.
const at = (dia: number, hhmm: string) => kitchenStatus(new Date(`2026-11-${String(dia).padStart(2, '0')}T${hhmm}:00-03:00`))

describe('kitchenStatus (terça a sexta 15:30–22:00, sábado 10:30–17:00)', () => {
  it.each([
    ['terça 14:00 → ainda fechada, abre hoje', 3, '14:00', 'closed', 'Cozinha fechada', 'abre hoje às 15:30'],
    ['terça 15:30 → abre agora', 3, '15:30', 'open', 'Cozinha aberta', 'até 22:00'],
    ['quarta 19:00 → aberta', 4, '19:00', 'open', 'Cozinha aberta', 'até 22:00'],
    ['terça 21:30 → fechando em 30 min', 3, '21:30', 'closing', 'Fechando em 30 min', 'até 22:00'],
    ['terça 21:45 → fechando em 15 min', 3, '21:45', 'closing', 'Fechando em 15 min', 'até 22:00'],
    ['terça 22:00 → fechou, abre amanhã', 3, '22:00', 'closed', 'Cozinha fechada', 'abre amanhã às 15:30'],
    ['sexta 22:30 → fechou, abre amanhã (sábado)', 6, '22:30', 'closed', 'Cozinha fechada', 'abre amanhã às 10:30'],
    ['sábado 10:29 → abre hoje às 10:30', 7, '10:29', 'closed', 'Cozinha fechada', 'abre hoje às 10:30'],
    ['sábado 12:00 → aberta até 17:00', 7, '12:00', 'open', 'Cozinha aberta', 'até 17:00'],
    ['sábado 17:00 → fechou, só abre terça', 7, '17:00', 'closed', 'Cozinha fechada', 'abre terça às 15:30'],
    ['domingo → abre terça', 8, '12:00', 'closed', 'Cozinha fechada', 'abre terça às 15:30'],
    ['segunda → abre amanhã', 9, '12:00', 'closed', 'Cozinha fechada', 'abre amanhã às 15:30'],
  ] as const)('%s', (_nome, dia, hora, status, title, detail) => {
    // dia do mês de novembro/2026: 3 = terça, 4 = quarta, 6 = sexta, 7 = sábado, 8 = domingo, 9 = segunda
    expect(at(dia, hora)).toMatchObject({ status, title, detail })
  })

  it('usa o fuso de Brasília, não o do aparelho: 18:30 UTC de terça = 15:30 em Brasília (abre)', () => {
    expect(kitchenStatus(new Date('2026-11-03T18:30:00Z'))).toMatchObject({ status: 'open' })
    expect(kitchenStatus(new Date('2026-11-03T18:29:00Z'))).toMatchObject({ status: 'closed', detail: 'abre hoje às 15:30' })
  })

  it('informa o dia da semana de hoje (para destacar na lista)', () => {
    expect(at(3, '12:00').today).toBe(2) // terça
    expect(at(7, '12:00').today).toBe(6) // sábado
  })
})
