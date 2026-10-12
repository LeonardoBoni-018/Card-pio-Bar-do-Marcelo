import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { imageSrc } from '../../api/client'
import { uploadImage } from '../../api/endpoints'
import { MugIcon } from '../../components/MugIcon'
import { Button } from '../../components/ui/Button'

const MAX_BYTES = 5 * 1024 * 1024
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
    mutationFn: uploadImage,
    onSuccess: (data) => onChange(data.filename),
    onError: () => setPreview(null),
  })

  useEffect(() => onBusyChange?.(upload.isPending), [upload.isPending, onBusyChange])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const choose = (file: File | undefined) => {
    setLocalError(null)
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return setLocalError('Formato não suportado. Envie uma foto JPG ou PNG.')
    if (file.size > MAX_BYTES) return setLocalError('A foto passa de 5 MB. Escolha uma menor.')
    setPreview(URL.createObjectURL(file))
    upload.mutate(file)
  }

  const shown = filename ? (preview ?? imageSrc(currentUrl)) : preview
  const error = localError ?? (upload.isError ? upload.error.message : null)

  return (
    <div>
      <p id="foto-label" className="mb-1.5 text-sm font-bold text-tinta-700">
        Foto
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]) }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 text-center ${dragging ? 'border-brasa-600 bg-brasa-50' : 'border-laranja-300 bg-white'}`}
      >
        {shown ? (
          <img src={shown} alt="Pré-visualização da foto do item" className="aspect-[4/3] w-full max-w-60 rounded-lg object-cover" />
        ) : (
          <span className="flex aspect-[4/3] w-full max-w-60 items-center justify-center rounded-lg bg-gradient-to-br from-laranja-500 to-brasa-600" aria-hidden="true">
            <MugIcon className="h-20 w-20" />
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
        <p className="text-sm text-tinta-500">JPG ou PNG, até 5 MB. Você também pode arrastar a foto para cá.</p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-brasa-700">
          {error}
        </p>
      )}
    </div>
  )
}
