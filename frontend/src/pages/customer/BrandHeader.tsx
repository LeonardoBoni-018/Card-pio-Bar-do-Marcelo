import { MugIcon } from '../../components/MugIcon'

export function BrandHeader() {
  return (
    <header>
      <div className="bg-gradient-to-br from-brasa-800 via-brasa-600 to-laranja-500 px-4 pb-8 pt-10 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
          <MugIcon className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
          <div>
            <h1 className="font-display text-5xl leading-tight drop-shadow-[0_2px_0_rgba(127,15,25,0.55)] sm:text-6xl">Bar do Marcelo</h1>
            <p
              className="mt-2 inline-block bg-white px-7 py-1 text-sm font-extrabold tracking-wide text-brasa-700 [clip-path:polygon(0_0,100%_0,96%_50%,100%_100%,0_100%,4%_50%)]"
            >
              Bar &amp; Mercearia Planalto
            </p>
          </div>
        </div>
      </div>
      <div className="awning h-3" aria-hidden="true" />
    </header>
  )
}
