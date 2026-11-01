import { LogoName } from '../../components/Logo'
import { KitchenStatus } from './KitchenStatus'

/**
 * Cabeçalho compacto e fixo no topo: toldo listrado, nome do bar e o selo de horário da cozinha.
 * Antes o logo gigante ocupava a primeira tela inteira; agora o cardápio começa logo abaixo e a marca
 * e o horário continuam visíveis enquanto o cliente rola.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <h1 className="sr-only">Cardápio</h1>
      <div className="awning h-1.5" aria-hidden="true" />
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 min-[380px]:gap-3 md:h-16">
        <LogoName alt="Bar do Marcelo — Bar & Mercearia Planalto" className="h-8 w-auto shrink-0 min-[380px]:h-9 md:h-11" />
        <KitchenStatus />
      </div>
    </header>
  )
}
