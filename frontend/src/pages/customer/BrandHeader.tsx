import { LogoFull } from '../../components/Logo'

/** Cabeçalho do cliente: o logo do letreiro sobre fundo branco e o toldo listrado da fachada. */
export function BrandHeader() {
  return (
    <header className="bg-white">
      <h1 className="sr-only">Cardápio</h1>
      <div className="mx-auto flex max-w-3xl justify-center px-4 pb-3 pt-5">
        <LogoFull className="h-48 w-auto sm:h-60" />
      </div>
      <div className="awning h-3" aria-hidden="true" />
    </header>
  )
}
