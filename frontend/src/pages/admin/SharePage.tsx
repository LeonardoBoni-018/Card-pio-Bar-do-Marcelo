import { useEffect, useState } from 'react'
import { LogoFull } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { CardTitle, cardClass, PageHeader } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'

/** Divulgação: link do cardápio, QR code para colar nas mesas e cartaz pronto para imprimir. */
export default function SharePage() {
  const toast = useToast()
  const link = window.location.origin + '/'
  const [qr, setQr] = useState<string | null>(null)

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

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
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
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-bold text-brasa-700 ring-1 ring-tinta-300 hover:bg-brasa-50 md:min-h-11 md:rounded-lg md:px-4 md:text-sm gap-2">
              <Icon name="eye" />
              Abrir cardápio
            </a>
          </div>
          <p className="mt-4 text-sm text-tinta-500">Dica: use o mesmo link no Instagram, no WhatsApp e no Google Meu Negócio.</p>
        </section>

        <section aria-label="Cartaz com QR code" className={`cartaz ${cardClass} text-center`}>
          <div className="awning -mx-4 -mt-4 mb-4 h-3 overflow-hidden rounded-t-2xl sm:-mx-5 sm:-mt-5" aria-hidden="true" />
          <LogoFull className="mx-auto h-auto w-44" />
          <p className="mt-2 text-xl font-extrabold text-brasa-700">Veja o nosso cardápio</p>
          {qr ? (
            <img src={qr} alt={`QR code que abre ${link}`} width={240} height={240} className="mx-auto mt-3 size-60" />
          ) : (
            <div className="skeleton mx-auto mt-3 size-60 rounded-lg" role="status" aria-label="Gerando QR code" />
          )}
          <p className="mt-2 text-sm font-bold text-tinta-700">Aponte a câmera do celular</p>
        </section>
      </div>

      <div>
        <Button variant="accent" onClick={() => window.print()} disabled={!qr} className="gap-2">
          <Icon name="printer" />
          Imprimir cartaz
        </Button>
      </div>
    </div>
  )
}
