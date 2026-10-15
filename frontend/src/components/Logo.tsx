import logoFull from '../assets/logo-full.webp'
import logoMark from '../assets/logo-mark.webp'
import logoName from '../assets/logo-name.webp'

/** Logo completo do letreiro (caneca, espigas, faixa e nome). Proporção 720×611. */
export function LogoFull({ className = '' }: { className?: string }) {
  return <img src={logoFull} alt="Bar do Marcelo — Bar & Mercearia Planalto" width={720} height={611} fetchPriority="high" className={className} />
}

/** Só o nome em letra cursiva, para cabeçalhos pequenos. Proporção 600×157. */
export function LogoName({ className = '' }: { className?: string }) {
  return <img src={logoName} alt="Bar do Marcelo" width={600} height={157} className={className} />
}

/** Caneca com as espigas, sem texto — decorativo. */
export function LogoMark({ className = '' }: { className?: string }) {
  return <img src={logoMark} alt="" aria-hidden="true" width={320} height={203} className={className} />
}
