/** Horário de funcionamento da cozinha (fuso de Brasília, independente do fuso do aparelho do cliente). */
export const TIME_ZONE = 'America/Sao_Paulo'

export interface Shift {
  /** 0 = domingo … 6 = sábado */
  days: number[]
  label: string
  open: string
  close: string
}

export const KITCHEN_SHIFTS: Shift[] = [
  { days: [2, 3, 4, 5], label: 'Terça a sexta', open: '15:30', close: '22:00' },
  { days: [6], label: 'Sábado', open: '10:30', close: '17:00' },
]

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const CLOSING_SOON_MINUTES = 30

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const shiftOf = (day: number): Shift | undefined => KITCHEN_SHIFTS.find((s) => s.days.includes(day))

/** Dia da semana e minutos desde 00:00 no horário de Brasília. */
export function brasiliaClock(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: WEEKDAY_INDEX[get('weekday')] ?? 0, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export interface KitchenState {
  status: 'open' | 'closing' | 'closed'
  /** Texto principal do selo: "Cozinha aberta", "Fechando em 20 min", "Cozinha fechada". */
  title: string
  /** Complemento: "até 22:00", "abre hoje às 15:30", "abre terça às 15:30". */
  detail: string
  /** Dia da semana de hoje (para destacar na lista). */
  today: number
}

export function kitchenStatus(date: Date = new Date()): KitchenState {
  const { day, minutes } = brasiliaClock(date)
  const today = shiftOf(day)

  if (today) {
    const open = toMinutes(today.open)
    const close = toMinutes(today.close)
    if (minutes >= open && minutes < close) {
      const left = close - minutes
      return left <= CLOSING_SOON_MINUTES
        ? { status: 'closing', title: `Fechando em ${left} min`, detail: `até ${today.close}`, today: day }
        : { status: 'open', title: 'Cozinha aberta', detail: `até ${today.close}`, today: day }
    }
    if (minutes < open) return { status: 'closed', title: 'Cozinha fechada', detail: `abre hoje às ${today.open}`, today: day }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (day + offset) % 7
    const next = shiftOf(nextDay)
    if (next) {
      const when = offset === 1 ? 'amanhã' : DAY_NAMES[nextDay]
      return { status: 'closed', title: 'Cozinha fechada', detail: `abre ${when} às ${next.open}`, today: day }
    }
  }
  return { status: 'closed', title: 'Cozinha fechada', detail: '', today: day }
}
