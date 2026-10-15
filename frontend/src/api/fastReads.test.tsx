import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { ItemPhoto } from '../pages/customer/MenuItemRow'
import { server } from '../test/server'
import { API } from '../test/utils'
import { publicImageSrc } from './client'
import { getMenu } from './endpoints'
import type { PublicItem } from './types'

const menu = [{ id: 1, name: 'Cervejas', items: [] }]
const item = { id: 1, name: 'Chopp', description: '', price: 8, imageUrl: '/api/images/a.jpg', featured: false } as PublicItem

afterEach(() => vi.unstubAllEnvs())

describe('publicImageSrc', () => {
  it('desligado: foto vem direto da API', () => {
    vi.stubEnv('VITE_FAST_READS', '0')
    expect(publicImageSrc('/api/images/a.jpg')).toBe(`${API}/api/images/a.jpg`)
    expect(publicImageSrc('/api/images/a.jpg', 'thumb')).toBe(`${API}/api/images/a.jpg?size=thumb`)
  })

  it('ligado: usa a função da Vercel (miniatura incluída); useFast=false volta para a API; sem foto devolve null', () => {
    vi.stubEnv('VITE_FAST_READS', '1')
    expect(publicImageSrc('/api/images/a.jpg', 'thumb')).toBe(`${API}/api/fast/images/a.jpg?size=thumb`)
    expect(publicImageSrc('/api/images/a.jpg', undefined, false)).toBe(`${API}/api/images/a.jpg`)
    expect(publicImageSrc(null)).toBeNull()
  })
})

describe('getMenu com leituras rápidas', () => {
  it('desligado: só usa /api/menu', async () => {
    vi.stubEnv('VITE_FAST_READS', '0')
    const fast = vi.fn()
    server.use(http.get(`${API}/api/fast/menu`, () => (fast(), HttpResponse.json([]))), http.get(`${API}/api/menu`, () => HttpResponse.json(menu)))
    expect(await getMenu()).toEqual(menu)
    expect(fast).not.toHaveBeenCalled()
  })

  it('ligado: usa a função da Vercel', async () => {
    vi.stubEnv('VITE_FAST_READS', '1')
    const slow = vi.fn()
    server.use(http.get(`${API}/api/fast/menu`, () => HttpResponse.json(menu)), http.get(`${API}/api/menu`, () => (slow(), HttpResponse.json([]))))
    expect(await getMenu()).toEqual(menu)
    expect(slow).not.toHaveBeenCalled()
  })

  it.each([503, 404, 500])('ligado, mas a função responde %i: cai na API do Render', async (status) => {
    vi.stubEnv('VITE_FAST_READS', '1')
    server.use(http.get(`${API}/api/fast/menu`, () => new HttpResponse(null, { status })), http.get(`${API}/api/menu`, () => HttpResponse.json(menu)))
    expect(await getMenu()).toEqual(menu)
  })

  it('ligado, mas a rede falha na função: cai na API', async () => {
    vi.stubEnv('VITE_FAST_READS', '1')
    server.use(http.get(`${API}/api/fast/menu`, () => HttpResponse.error()), http.get(`${API}/api/menu`, () => HttpResponse.json(menu)))
    expect(await getMenu()).toEqual(menu)
  })

  it('cancelamento não dispara a segunda tentativa', async () => {
    vi.stubEnv('VITE_FAST_READS', '1')
    const slow = vi.fn()
    server.use(http.get(`${API}/api/menu`, () => (slow(), HttpResponse.json(menu))))
    const controller = new AbortController()
    controller.abort()
    await expect(getMenu(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(slow).not.toHaveBeenCalled()
  })
})

describe('ItemPhoto', () => {
  it('ligado: usa a função e, se a imagem falhar, troca para a API', () => {
    vi.stubEnv('VITE_FAST_READS', '1')
    const { container } = render(<ItemPhoto item={item} thumb className="x" />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe(`${API}/api/fast/images/a.jpg?size=thumb`)
    fireEvent.error(img)
    expect(container.querySelector('img')!.getAttribute('src')).toBe(`${API}/api/images/a.jpg?size=thumb`)
  })

  it('sem foto mostra a marca', () => {
    const { container } = render(<ItemPhoto item={{ ...item, imageUrl: null }} className="x" />)
    expect(container.querySelector('img')?.getAttribute('src')).not.toContain('/api/')
    expect(screen.queryByRole('img')).toBeNull()
  })
})
