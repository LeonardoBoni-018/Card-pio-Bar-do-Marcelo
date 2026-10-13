import { prepareImage } from './image'

const file = (size: number, type = 'image/jpeg', name = 'foto.jpg') => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function mockCanvas(blob: Blob | null = new Blob(['y'.repeat(300)], { type: 'image/jpeg' })) {
  const drawImage = vi.fn()
  const fillRect = vi.fn()
  const context = { drawImage, fillRect, fillStyle: '' }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(blob))
  return { drawImage, fillRect }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('prepareImage', () => {
  it('sem suporte do navegador devolve o arquivo original', async () => {
    const original = file(8_000_000)
    expect(await prepareImage(original)).toBe(original)
  })

  it('reduz foto grande de celular (4000×3000) para até 1600 px e converte em JPEG leve', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }))
    const { drawImage, fillRect } = mockCanvas()

    const result = await prepareImage(file(9_000_000, 'image/png', 'IMG_2024.PNG'))

    expect(result).not.toBe(undefined)
    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('IMG_2024.jpg')
    expect(result.size).toBe(300)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(fillRect).toHaveBeenCalled() // fundo branco antes de desenhar
    expect(close).toHaveBeenCalled()
  })

  it('foto já pequena e leve é enviada como está', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }))
    mockCanvas()
    const original = file(200_000)
    expect(await prepareImage(original)).toBe(original)
  })

  it('imagem pequena em dimensões mas pesada é recomprimida sem mudar o tamanho', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 900, close: vi.fn() }))
    const { drawImage } = mockCanvas()
    const result = await prepareImage(file(3_000_000))
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 900)
    expect(result.size).toBe(300)
  })

  it('se a recompressão não ajudar, mantém o original', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 900, close: vi.fn() }))
    mockCanvas(new Blob(['z'.repeat(5_000_000)]))
    const original = file(1_300_000)
    expect(await prepareImage(original)).toBe(original)
  })

  it('erro ao decodificar (formato estranho) devolve o original para a API decidir', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('não decodifica')))
    const original = file(2_000_000, 'image/heic', 'a.heic')
    expect(await prepareImage(original)).toBe(original)
  })

  it('sem contexto 2D ou sem blob, devolve o original', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const a = file(9_000_000)
    expect(await prepareImage(a)).toBe(a)

    mockCanvas(null)
    const b = file(9_000_000)
    expect(await prepareImage(b)).toBe(b)
  })
})
