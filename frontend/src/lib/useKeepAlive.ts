import { useEffect } from 'react'
import { imageSrc } from '../api/client'

const INTERVAL_MS = 8 * 60 * 1000 // menos que os 15 min em que o plano gratuito do Render derruba a API

/**
 * Enquanto o painel está aberto e visível, faz uma chamada leve a cada 8 minutos para a API não dormir no meio
 * de uma edição (salvar depois de um tempo parado esperaria ~70 s para a API acordar).
 */
export function useKeepAlive(): void {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== 'visible') return
      // reaproveita o prefixo da API: imageSrc('/api/menu') = BASE + '/api/menu'
      void fetch(imageSrc('/api/menu') ?? '/api/menu', { cache: 'no-store' }).catch(() => undefined)
    }
    const timer = setInterval(ping, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])
}
