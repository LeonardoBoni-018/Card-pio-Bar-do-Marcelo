import { createPortal } from 'react-dom'
import { LogoFull } from '../../components/Logo'

export type Orientation = 'horizontal' | 'vertical'

export interface CardSize {
  orientation: Orientation
  /** largura e altura do cartão impresso, em centímetros */
  widthCm: number
  heightCm: number
}

export interface Preset extends CardSize {
  id: string
  label: string
}

/** Formatos prontos. O display de mesa (como o da Amstel) tem a janela deitada. */
export const PRESETS: Preset[] = [
  { id: 'display', label: 'Display de mesa (deitado)', orientation: 'horizontal', widthCm: 14, heightCm: 10 },
  { id: 'a6-deitado', label: 'A6 deitado', orientation: 'horizontal', widthCm: 14.8, heightCm: 10.5 },
  { id: 'a6-em-pe', label: 'A6 em pé', orientation: 'vertical', widthCm: 10.5, heightCm: 14.8 },
]

/** Área útil de uma folha A4 com margem de 1 cm. */
const SHEET = { widthCm: 19, heightCm: 27.7 }

/** Quantos cartões cabem numa folha A4 (para recortar e colocar em várias mesas). */
export function copiesPerSheet({ widthCm, heightCm }: Pick<CardSize, 'widthCm' | 'heightCm'>): number {
  const cols = Math.floor(SHEET.widthCm / widthCm)
  const rows = Math.floor(SHEET.heightCm / heightCm)
  return Math.max(1, cols * rows)
}

/** Orientação pela medida: mais largo que alto = deitado. */
export const orientationOf = (widthCm: number, heightCm: number): Orientation => (widthCm >= heightCm ? 'horizontal' : 'vertical')

interface QrCardProps {
  qr: string | null
  link: string
  size: CardSize
  /** Na prévia o QR tem texto alternativo; nas cópias de impressão é decorativo (evita repetir para leitores de tela). */
  decorative?: boolean
}

/** Endereço curto para imprimir embaixo do QR (sem https:// e sem a barra final). */
const shortLink = (link: string) => link.replace(/^https?:\/\//, '').replace(/\/$/, '')

/**
 * O cartão com o QR code. Tudo dentro dele é medido em proporção ao próprio cartão (unidades cqw/cqh),
 * então a mesma arte serve para a prévia na tela e para a impressão no tamanho exato em centímetros.
 */
export function QrCard({ qr, link, size, decorative = false }: QrCardProps) {
  const qrImage = (className: string) =>
    qr ? (
      <img src={qr} alt={decorative ? '' : `QR code que abre ${link}`} width={240} height={240} className={className} />
    ) : (
      <div className={`skeleton rounded-lg ${className}`} role={decorative ? undefined : 'status'} aria-label={decorative ? undefined : 'Gerando QR code'} />
    )

  return (
    <div
      className="cartaz relative w-full overflow-hidden rounded-xl bg-white text-center shadow-sm ring-1 ring-brasa-100 [container-type:size]"
      style={{ aspectRatio: `${size.widthCm} / ${size.heightCm}`, ['--cartaz-w' as string]: `${size.widthCm}cm`, ['--cartaz-h' as string]: `${size.heightCm}cm` }}
      data-orientation={size.orientation}
    >
      {size.orientation === 'horizontal' ? (
        <>
          <div className="awning absolute inset-x-0 top-0 h-[4cqh]" aria-hidden="true" />
          <div className="flex h-full items-center gap-[3cqw] pb-[4cqh] pl-[4cqw] pr-[5cqw] pt-[8cqh]">
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
              <LogoFull className="h-[44cqh] w-auto max-w-full object-contain" />
              <p className="mt-[3cqh] text-[7.5cqh] font-extrabold leading-tight text-brasa-700">Veja o nosso cardápio</p>
              <p className="mt-[1.5cqh] text-[5cqh] font-bold leading-tight text-tinta-700">Aponte a câmera do celular</p>
            </div>
            <div className="flex shrink-0 flex-col items-center">
              {qrImage('size-[70cqh]')}
              <p className="mt-[1.5cqh] text-[4.5cqh] font-extrabold text-tinta-900">{shortLink(link)}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="awning absolute inset-x-0 top-0 h-[3cqmin]" aria-hidden="true" />
          {/* o logo encolhe para caber: o QR (o que importa) mantém o tamanho em qualquer proporção */}
          <div className="flex h-full flex-col items-center px-[6cqw] pb-[4cqmin] pt-[7cqmin]">
            <LogoFull className="min-h-0 w-auto max-w-[56cqw] flex-1 object-contain" />
            <p className="mt-[2.5cqmin] text-[6.5cqmin] font-extrabold leading-tight text-brasa-700">Veja o nosso cardápio</p>
            {qrImage('mt-[2.5cqmin] size-[min(58cqw,48cqh)] shrink-0')}
            <p className="mt-[1.5cqmin] text-[4.8cqmin] font-bold leading-tight text-tinta-700">Aponte a câmera do celular</p>
            <p className="text-[4.5cqmin] font-extrabold leading-tight text-tinta-900">{shortLink(link)}</p>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Folha de impressão: só existe no papel (escondida na tela). Fica direto no <body> para a impressão
 * esconder todo o resto do painel e não gerar páginas em branco.
 */
export function PrintSheet({ qr, link, size, copies }: { qr: string | null; link: string; size: CardSize; copies: number }) {
  return createPortal(
    <div className="folha-impressao hidden print:flex" aria-hidden="true">
      {Array.from({ length: copies }, (_, i) => (
        <QrCard key={i} qr={qr} link={link} size={size} decorative />
      ))}
    </div>,
    document.body,
  )
}
