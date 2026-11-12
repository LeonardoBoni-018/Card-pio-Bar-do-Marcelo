import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../api/queries'
import type { Comanda } from '../../api/types'
import { useToast } from '../../components/ui/Toast'

/**
 * Ação numa comanda: ao terminar, troca a comanda na tela pela resposta (já recalculada) e atualiza as mesas.
 * Em erro (ex.: outra pessoa juntou/fechou a comanda), avisa e relê do servidor.
 */
export function useComandaAction<V>(comandaId: number, action: (vars: V) => Promise<Comanda>, success?: (c: Comanda, vars: V) => string | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: (comanda, vars) => {
      queryClient.setQueryData(keys.comanda(comanda.id), comanda)
      void queryClient.invalidateQueries({ queryKey: keys.serviceTables })
      const message = success?.(comanda, vars)
      if (message) toast.success(message)
    },
    onError: (error) => {
      toast.error(error.message)
      void queryClient.invalidateQueries({ queryKey: keys.comanda(comandaId) })
      void queryClient.invalidateQueries({ queryKey: keys.serviceTables })
    },
  })
}
