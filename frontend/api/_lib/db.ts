import { neon } from '@neondatabase/serverless'
import type { Sql } from './core'

let cached: Sql | undefined

/**
 * Conexão do Neon por HTTPS (sem conexão persistente: ideal para funções que sobem e descem).
 * MENU_DATABASE_URL deve ser de um usuário SOMENTE LEITURA com acesso apenas a category, menu_item e image.
 */
export function getSql(): Sql {
  const url = process.env.MENU_DATABASE_URL
  if (!url) throw new Error('MENU_DATABASE_URL não está configurada')
  if (!cached) {
    const client = neon(url)
    cached = (text, params = []) => client.query(text, params) as Promise<Record<string, unknown>[]>
  }
  return cached
}
