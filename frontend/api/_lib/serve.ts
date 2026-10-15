import type { IncomingMessage, ServerResponse } from 'node:http'
import { problem, type Reply } from './core'

export interface Context {
  url: URL
  ifNoneMatch: string | undefined
}

/** Último trecho do caminho (ex.: /api/fast/images/abc.jpg -> abc.jpg). */
export const lastSegment = (url: URL): string => decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')

function send(res: ServerResponse, reply: Reply, headOnly: boolean): void {
  res.statusCode = reply.status
  for (const [name, value] of Object.entries(reply.headers)) res.setHeader(name, value)
  res.end(headOnly || reply.status === 304 ? undefined : reply.body)
}

/** Aceita só GET/HEAD, trata erros sem vazar detalhes e envia a resposta. */
export async function serve(req: IncomingMessage, res: ServerResponse, run: (context: Context) => Promise<Reply>): Promise<void> {
  const headOnly = req.method === 'HEAD'
  if (req.method !== 'GET' && !headOnly) {
    send(res, problem(405, 'Method Not Allowed', 'Use GET.', { Allow: 'GET, HEAD' }), false)
    return
  }
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const header = req.headers['if-none-match']
    send(res, await run({ url, ifNoneMatch: Array.isArray(header) ? header.join(',') : header }), headOnly)
  } catch (error) {
    console.error('Falha ao ler o cardápio', error) // o detalhe fica só no log
    send(res, problem(503, 'Service Unavailable', 'Serviço indisponível. Tente novamente em instantes.', { 'Cache-Control': 'no-store' }), false)
  }
}
