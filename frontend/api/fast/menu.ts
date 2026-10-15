import type { IncomingMessage, ServerResponse } from 'node:http'
import { getMenu } from '../_lib/core'
import { getSql } from '../_lib/db'
import { serve } from '../_lib/serve'

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return serve(req, res, ({ ifNoneMatch }) => getMenu(getSql(), ifNoneMatch))
}
