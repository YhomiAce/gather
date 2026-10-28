import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { z } from 'zod'
import * as schema from '../database/schema'

export type Db = PostgresJsDatabase<typeof schema>

const databaseUrlSchema = z
  .string({ error: 'NUXT_DATABASE_URL (or DATABASE_URL) is not set' })
  .min(1, 'NUXT_DATABASE_URL (or DATABASE_URL) is not set')
  .regex(/^postgres(ql)?:\/\//, 'Database URL must start with postgres:// or postgresql://')

let client: postgres.Sql | undefined
let db: Db | undefined

/**
 * Resolves the database URL at runtime: `NUXT_DATABASE_URL` (via runtimeConfig) wins,
 * then plain `DATABASE_URL`.
 */
export function resolveDatabaseUrl(): string {
  const fromConfig = useRuntimeConfig().databaseUrl
  return databaseUrlSchema.parse(fromConfig || process.env.DATABASE_URL)
}

/** Returns the raw postgres.js client, creating it on first use. */
export function useSql(): postgres.Sql {
  client ??= postgres(resolveDatabaseUrl(), { max: 10, idle_timeout: 30, connect_timeout: 10, onnotice: () => {} })
  return client
}

/**
 * Returns the Drizzle instance. Prefer `useReadyDb()` in request handlers so
 * migrations are guaranteed to have run.
 */
export function useDb(): Db {
  db ??= drizzle(useSql(), { schema })
  return db
}

/** Closes the pool (used on shutdown). */
export async function closeDb(): Promise<void> {
  await client?.end({ timeout: 5 })
  client = undefined
  db = undefined
}
