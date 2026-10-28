import { runMigrations, MIGRATION_LOCK_KEY } from './migrate'
import { seedIfEmpty } from './seed'
import { useDb, useSql, type Db } from './db'

let ready: Promise<void> | undefined

/**
 * Migrates and seeds the database once per process. Concurrent instances are
 * serialised with a Postgres advisory lock, so this is safe to run on every start.
 */
export function ensureDatabaseReady(): Promise<void> {
  ready ??= (async () => {
    const sql = useSql()
    const reserved = await sql.reserve()
    try {
      await reserved`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`
      try {
        const applied = await runMigrations(reserved)
        if (applied.length) console.info(`[gather] applied migrations: ${applied.join(', ')}`)
        await seedIfEmpty(useDb())
      } finally {
        await reserved`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`
      }
    } finally {
      reserved.release()
    }
  })().catch((error: unknown) => {
    ready = undefined // allow a retry on the next request
    throw error
  })
  return ready
}

/**
 * Drizzle instance for request handlers; waits for migrations and seeding first.
 * Fails with a clean 503 if the database is unavailable.
 */
export async function useReadyDb(): Promise<Db> {
  try {
    await ensureDatabaseReady()
  } catch (error) {
    console.error('[gather] database not ready:', error instanceof Error ? error.message : error)
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  }
  return useDb()
}
