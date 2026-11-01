import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { KITCHEN_SHIFTS, kitchenStatus } from '../../lib/kitchenHours'

const DOT = { open: 'bg-emerald-500', closing: 'bg-laranja-500', closed: 'bg-brasa-600' } as const

/** Relógio que se atualiza a cada minuto (o selo muda sozinho quando a cozinha abre ou fecha). */
function useNow(frozen?: Date): Date {
  const [now, setNow] = useState(() => frozen ?? new Date())
  useEffect(() => {
    if (frozen) return
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [frozen])
  return frozen ?? now
}

/** Lista de horários, usada no detalhe e no rodapé. A linha de hoje fica destacada. */
export function KitchenHoursList({ today, className = '' }: { today?: number; className?: string }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {KITCHEN_SHIFTS.map((shift) => {
        const isToday = today !== undefined && shift.days.includes(today)
        return (
          <li key={shift.label} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${isToday ? 'bg-sol-100 ring-1 ring-sol-500' : ''}`}>
            <span className="flex items-center gap-2 font-bold">
              {shift.label}
              {isToday && <span className="rounded-full bg-brasa-600 px-2 py-0.5 text-xs font-extrabold text-white">hoje</span>}
            </span>
            <span className="font-extrabold tabular-nums">
              {shift.open} às {shift.close}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Selo fixo no cabeçalho com o estado da cozinha agora ("Cozinha aberta · até 22:00"). Ao tocar, abre os horários completos.
 * `now` só existe para os testes poderem congelar o relógio.
 */
export function KitchenStatus({ now }: { now?: Date }) {
  const state = kitchenStatus(useNow(now))
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${state.title}${state.detail ? `, ${state.detail}` : ''}. Ver horário da cozinha`}
        className="press flex min-h-11 min-w-0 items-center gap-1.5 rounded-full bg-sol-100 py-1 pl-2.5 pr-3 min-[380px]:gap-2 min-[380px]:pl-3 min-[380px]:pr-3.5 text-left ring-1 ring-sol-500 hover:bg-sol-300/60"
      >
        <span className={`size-2.5 shrink-0 rounded-full ${DOT[state.status]} ${state.status === 'open' ? 'animate-pulse' : ''}`} aria-hidden="true" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[0.8rem] font-extrabold text-tinta-900">{state.title}</span>
          {state.detail && <span className="block truncate text-[0.7rem] font-bold text-tinta-700">{state.detail}</span>}
        </span>
        <Icon name="clock" className="hidden size-4 shrink-0 text-brasa-700 min-[380px]:block" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="horario-titulo"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false)
        }}
        className="gaveta m-0 mt-auto w-full max-w-none rounded-t-3xl p-0 shadow-2xl backdrop:bg-tinta-900/60 sm:m-auto sm:w-[min(94vw,26rem)] sm:rounded-2xl"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <h2 id="horario-titulo" className="flex items-center gap-2 text-xl font-extrabold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brasa-600 text-white">
              <Icon name="food" className="size-5" />
            </span>
            Horário da cozinha
          </h2>
          <p className="mt-3 flex items-center gap-2 font-bold">
            <span className={`size-2.5 rounded-full ${DOT[state.status]}`} aria-hidden="true" />
            {state.title}
            {state.detail && <span className="font-semibold text-tinta-700">· {state.detail}</span>}
          </p>
          <KitchenHoursList today={state.today} className="mt-4 text-tinta-900" />
          <button type="button" onClick={() => setOpen(false)} className="press mt-5 min-h-12 w-full rounded-xl bg-brasa-600 px-4 py-3 text-base font-bold text-white active:bg-brasa-800">
            Fechar
          </button>
        </div>
      </dialog>
    </>
  )
}
