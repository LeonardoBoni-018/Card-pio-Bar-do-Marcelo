import logoFull from '../assets/logo-full.svg'
import logoMark from '../assets/logo-mark.svg'
import logoName from '../assets/logo-name.svg'

/** Logo completo do letreiro (caneca, espigas, faixa e nome). Proporção original 700×925. */
export function LogoFull({ className = '' }: { className?: string }) {
  return <img src={logoFull} alt="Bar do Marcelo — Bar & Mercearia Planalto" width={700} height={925} className={className} />
}

/** Só o nome em letra cursiva, para cabeçalhos pequenos. Proporção 700×325. */
export function LogoName({ className = '' }: { className?: string }) {
  return <img src={logoName} alt="Bar do Marcelo" width={700} height={325} className={className} />
}

/** Caneca com as espigas, sem texto — decorativo. */
export function LogoMark({ className = '' }: { className?: string }) {
  return <img src={logoMark} alt="" aria-hidden="true" width={420} height={400} className={className} />
}
