import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/** Fio animado no topo enquanto algo carrega ou salva. Só aparece se demorar um pouco (sem piscar em respostas rápidas). */
export function TopProgress() {
  const busy = useIsFetching() + useIsMutating() > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!busy) {
      const hide = setTimeout(() => setVisible(false), 0)
      return () => clearTimeout(hide)
    }
    const show = setTimeout(() => setVisible(true), 250)
    return () => clearTimeout(show)
  }, [busy])

  if (!visible) return null
  return (
    <div aria-hidden="true" data-testid="top-progress" className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-sol-100">
      <div className="h-full w-2/5 animate-progress rounded-full bg-brasa-600" />
    </div>
  )
}
