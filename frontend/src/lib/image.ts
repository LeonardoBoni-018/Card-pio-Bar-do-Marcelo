const MAX_SIDE = 1600
const KEEP_AS_IS_BYTES = 1_200_000
const JPEG_QUALITY = 0.85

/**
 * Reduz a foto no próprio aparelho antes de enviar: fotos de câmera de celular têm 4–12 MB e milhares de pixels,
 * o que estoura o limite (5 MB), gasta franquia de dados e demora no 4G. Vira um JPEG de ~200–400 KB.
 * Se o navegador não suportar (ou der qualquer erro), devolve o arquivo original e a API valida de qualquer forma.
 */
export async function prepareImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) {
      bitmap.close?.()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close?.()
      return file
    }
    context.fillStyle = '#fff' // PNG com transparência vira JPEG: fundo branco em vez de preto
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || (scale === 1 && blob.size >= file.size)) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
