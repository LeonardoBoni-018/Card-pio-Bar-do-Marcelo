import type { IncomingMessage, ServerResponse } from 'node:http'
import { getImage } from '../../_lib/core'
import { getSql } from '../../_lib/db'
import { lastSegment, serve } from '../../_lib/serve'

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return serve(req, res, ({ url, ifNoneMatch }) => getImage(getSql(), lastSegment(url), url.searchParams.get('size') ?? undefined, ifNoneMatch))
}
