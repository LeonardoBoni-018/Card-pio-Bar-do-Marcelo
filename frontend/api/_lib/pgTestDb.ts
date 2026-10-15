import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from 'pg'
import type { Sql } from './core'

const MIGRATIONS = join(__dirname, '../../../backend/src/main/resources/db/migration')

/**
 * Banco de teste de verdade (PostgreSQL): cria um esquema isolado e aplica as MESMAS migrações Flyway do back-end,
 * então o teste vale também como contrato com o esquema real. Só roda com TEST_DATABASE_URL definida.
 */
export async function createTestDb(url: string) {
  const client = new Client({ connectionString: url })
  await client.connect()
  const schema = `fast_${Math.random().toString(36).slice(2, 10)}`
  await client.query(`create schema ${schema}`)
  await client.query(`set search_path to ${schema}`)
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await client.query(readFileSync(join(MIGRATIONS, file), 'utf8'))
  }

  const sql: Sql = async (text, params = []) => (await client.query(text, params as unknown[])).rows

  return {
    sql,
    exec: (text: string, params: unknown[] = []) => client.query(text, params),
    reset: async () => void (await client.query('truncate image, menu_item, category restart identity cascade')),
    close: async () => {
      await client.query(`drop schema ${schema} cascade`)
      await client.end()
    },
  }
}
