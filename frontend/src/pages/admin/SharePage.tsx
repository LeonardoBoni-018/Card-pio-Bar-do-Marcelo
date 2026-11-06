import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { inputClass } from '../../components/ui/Field'
import { CardTitle, cardClass, PageHeader } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'
import { copiesPerSheet, orientationOf, PRESETS, PrintSheet, QrCard, type CardSize } from './QrCard'

/** Endereço oficial do cardápio (o que vai no QR code impresso). */
export const OFFICIAL_URL = 'https://bardomarcelo.com.br/'

/**
 * Link divulgado: sempre o domínio oficial, mesmo que o dono esteja usando o endereço antigo (*.vercel.app).
 * Só em desenvolvimento/testes locais usa o próprio endereço, para o QR apontar para o ambiente de teste.
 */
export function publicMenuUrl(origin: string = window.location.origin): string {
  const { hostname } = new URL(origin)
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
  return local ? `${origin}/` : OFFICIAL_URL
}

const STORAGE_KEY = 'bdm.cartaz.v1'
const MIN_CM = 5
const MAX_CM = { width: 19, height: 27.7 } // cabe numa folha A4 com margem

interface Saved {
  preset: string
  widthCm: number
  heightCm: number
  fill: boolean
}

function loadSaved(): Saved {
  const fallback: Saved = { preset: PRESETS[0].id, widthCm: PRESETS[0].widthCm, heightCm: PRESETS[0].heightCm, fill: true }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Saved>) } : fallback
  } catch {
    return fallback
  }
}

const clampCm = (value: number, max: number) => Math.min(max, Math.max(MIN_CM, Math.round(value * 10) / 10))

/** Divulgação: link do cardápio, QR code para colar nas mesas e cartaz pronto para imprimir. */
export default function SharePage() {
  const toast = useToast()
  const link = publicMenuUrl()
  const [qr, setQr] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved>(loadSaved)

  const update = (changes: Partial<Saved>) =>
    setSaved((current) => {
      const next = { ...current, ...changes }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* sem armazenamento: só não lembra a escolha */
      }
      return next
    })

  const preset = PRESETS.find((p) => p.id === saved.preset)
  const size: CardSize = useMemo(() => {
    const widthCm = preset ? preset.widthCm : clampCm(saved.widthCm || MIN_CM, MAX_CM.width)
    const heightCm = preset ? preset.heightCm : clampCm(saved.heightCm || MIN_CM, MAX_CM.height)
    return { orientation: orientationOf(widthCm, heightCm), widthCm, heightCm }
  }, [preset, saved.widthCm, saved.heightCm])
  const perSheet = copiesPerSheet(size)
  const copies = saved.fill ? perSheet : 1

  useEffect(() => {
    let cancelled = false
    // biblioteca carregada só aqui: o resto do painel não paga por ela
    void import('qrcode').then(async ({ toDataURL }) => {
      const url = await toDataURL(link, { width: 720, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#2a1215', light: '#ffffff' } })
      if (!cancelled) setQr(url)
    })
    return () => {
      cancelled = true
    }
  }, [link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não deu para copiar. Selecione o link e copie manualmente.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader icon="qr" title="Divulgar o cardápio" subtitle="Cole o QR code nas mesas e no balcão: o cliente aponta a câmera e vê o cardápio atualizado." />

      <section aria-label="Link do cardápio" className={cardClass}>
        <CardTitle icon="link">Link do cardápio</CardTitle>
        <p className="mt-2 break-all rounded-lg bg-sol-100 px-3 py-2 font-bold ring-1 ring-sol-500" data-testid="link-cardapio">
          {link}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void copy()} className="gap-2">
            <Icon name="copy" />
            Copiar link
          </Button>
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold text-brasa-700 ring-1 ring-tinta-300 hover:bg-brasa-50 md:min-h-11 md:rounded-lg md:px-4 md:text-sm">
            <Icon name="eye" />
            Abrir cardápio
          </a>
        </div>
        <p className="mt-4 text-sm text-tinta-500">Dica: use o mesmo link no Instagram, no WhatsApp e no Google Meu Negócio.</p>
      </section>

      <section aria-labelledby="titulo-cartaz" className={cardClass}>
        <CardTitle icon="printer" id="titulo-cartaz">
          Cartaz com QR code
        </CardTitle>

        <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-bold text-tinta-700">Formato</legend>
              <div className="grid gap-2">
                {[...PRESETS.map((p) => ({ id: p.id, label: p.label, detail: `${p.widthCm} × ${p.heightCm} cm` })), { id: 'personalizado', label: 'Medida personalizada', detail: 'meça a janela do display' }].map((option) => (
                  <label
                    key={option.id}
                    className="press flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 text-sm font-extrabold text-tinta-700 ring-1 ring-tinta-300 has-[:checked]:bg-sol-300 has-[:checked]:text-tinta-900 has-[:checked]:ring-2 has-[:checked]:ring-brasa-600 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ceu-600"
                  >
                    <input
                      type="radio"
                      name="formato-cartaz"
                      value={option.id}
                      checked={saved.preset === option.id}
                      onChange={() => update({ preset: option.id, ...(preset && option.id === 'personalizado' ? { widthCm: preset.widthCm, heightCm: preset.heightCm } : {}) })}
                      className="sr-only"
                    />
                    <span>{option.label}</span>
                    <span className="text-xs font-bold text-tinta-500">{option.detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {!preset && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold text-tinta-700">
                  Largura (cm)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={MIN_CM}
                    max={MAX_CM.width}
                    step={0.5}
                    value={saved.widthCm}
                    onChange={(e) => update({ widthCm: Number(e.target.value) })}
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
                <label className="text-sm font-bold text-tinta-700">
                  Altura (cm)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={MIN_CM}
                    max={MAX_CM.height}
                    step={0.5}
                    value={saved.heightCm}
                    onChange={(e) => update({ heightCm: Number(e.target.value) })}
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
                <p className="col-span-2 text-sm text-tinta-500">
                  Meça a parte onde o papel entra no display. Mais largo que alto vira cartaz deitado. Limite: {MAX_CM.width} × {MAX_CM.height} cm.
                </p>
              </div>
            )}

            <label className="flex items-center gap-3 font-bold">
              <input type="checkbox" checked={saved.fill} onChange={(e) => update({ fill: e.target.checked })} className="size-5 accent-brasa-600" />
              Encher a folha A4 ({perSheet} {perSheet === 1 ? 'cartão' : 'cartões'})
            </label>

            <Button variant="accent" onClick={() => window.print()} disabled={!qr} className="w-full gap-2">
              <Icon name="printer" />
              Imprimir cartaz
            </Button>
            <p className="text-sm text-tinta-500">
              Sai no tamanho exato ({size.widthCm} × {size.heightCm} cm), com linha tracejada para recortar. Na janela de impressão, deixe a escala em 100% (&quot;tamanho real&quot;).
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-tinta-700" data-testid="cartaz-medida">
              Prévia · {size.orientation === 'horizontal' ? 'deitado' : 'em pé'} · {size.widthCm} × {size.heightCm} cm
            </p>
            <div className={`mx-auto ${size.orientation === 'horizontal' ? 'max-w-xl' : 'max-w-xs'}`}>
              <QrCard qr={qr} link={link} size={size} />
            </div>
          </div>
        </div>
      </section>

      <PrintSheet qr={qr} link={link} size={size} copies={copies} />
    </div>
  )
}
