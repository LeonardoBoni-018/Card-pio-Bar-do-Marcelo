import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { imageSrc } from '../../api/client'
import { uploadImage } from '../../api/endpoints'
import { prepareImage } from '../../lib/image'
import { LogoMark } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { Dot } from '../../components/ui/Spinner'

const MAX_BYTES = 5 * 1024 * 1024 // limite da API, depois de reduzida
const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png']

interface ImageUploadProps {
  /** Nome do arquivo já enviado (vai no formulário). */
  filename: string | null
  /** URL da foto atual, para mostrar ao editar um item existente. */
  currentUrl: string | null
  onChange: (filename: string | null) => void
  onBusyChange?: (busy: boolean) => void
}

export function ImageUpload({ filename, currentUrl, onChange, onBusyChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ready = await prepareImage(file)
      if (ready.size > MAX_BYTES) throw new Error('A foto passa de 5 MB mesmo depois de reduzida. Escolha outra.')
      return uploadImage(ready)
    },
    onSuccess: (data) => onChange(data.filename),
    onError: () => setPreview(null),
  })

  useEffect(() => onBusyChange?.(upload.isPending), [upload.isPending, onBusyChange])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const choose = (file: File | undefined) => {
    setLocalError(null)
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return setLocalError('Formato não suportado. Envie uma foto JPG ou PNG.')
    if (file.size > MAX_ORIGINAL_BYTES) return setLocalError('A foto é grande demais. Escolha outra.')
    setPreview(URL.createObjectURL(file))
    upload.mutate(file)
  }

  const shown = filename ? (preview ?? imageSrc(currentUrl)) : preview
  const error = localError ?? (upload.isError ? upload.error.message : null)

  return (
    <div>
      <p id="foto-label" className="sr-only">
        Foto
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]) }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 text-center ${dragging ? 'border-brasa-600 bg-brasa-50' : 'border-laranja-300 bg-white'}`}
      >
        {shown ? (
          <div className="relative w-full max-w-72">
            <img src={shown} alt="Pré-visualização da foto do item" className="aspect-[4/3] w-full animate-fade-in rounded-xl object-cover" />
            {upload.isPending && (
              <div role="status" className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 text-brasa-700">
                <Dot className="size-8" />
                <span className="sr-only">Enviando foto…</span>
              </div>
            )}
          </div>
        ) : (
          <span className="flex aspect-[4/3] w-full max-w-72 items-center justify-center rounded-xl bg-sol-100" aria-hidden="true">
            <LogoMark className="h-4/5 w-auto" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          aria-labelledby="foto-label"
          className="sr-only"
          onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? 'Enviando…' : shown ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {shown && !upload.isPending && (
            <Button variant="ghost" onClick={() => { setPreview(null); onChange(null) }}>
              Remover foto
            </Button>
          )}
        </div>
        <p className="text-sm text-tinta-500">JPG ou PNG. No celular você pode tirar a foto na hora; ela é reduzida automaticamente.</p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-brasa-700">
          {error}
        </p>
      )}
    </div>
  )
}
