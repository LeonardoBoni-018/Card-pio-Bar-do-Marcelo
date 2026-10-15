import { useEffect, useState } from 'react'

/** Vira `true` se `active` continuar verdadeiro por `ms` milissegundos (ex.: carregamento demorando). */
export function useSlow(active: boolean, ms = 5000): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setSlow(true), ms)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [active, ms])
  return active && slow
}
