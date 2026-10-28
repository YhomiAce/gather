import { createHash } from 'node:crypto'
import type postgres from 'postgres'
import { z } from 'zod'

const journalSchema = z.object({
  entries: z.array(z.object({ idx: z.number(), when: z.number(), tag: z.string() })),
})

/** Arbitrary constant used as the advisory lock key while migrating and seeding. */
export const MIGRATION_LOCK_KEY = 74_201_901

async function readAsset(key: string): Promise<string> {
  const value = await useStorage('assets:migrations').getItem(key)
  if (value === null || value === undefined) throw new Error(`Migration asset missing: ${key}`)
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/**
 * Applies pending Drizzle migrations that were bundled as Nitro server assets.
 *
 * This mirrors drizzle-orm's own migrator (same `drizzle.__drizzle_migrations`
 * table and hashing), so `drizzle-kit migrate` and this runner agree on what has
 * been applied. It reads from server assets instead of the filesystem so the
 * built `.output/` folder is self-contained. Pass a single reserved connection that
 * holds the migration advisory lock.
 *
 * @returns the tags of the migrations applied
 */
export async function runMigrations(sql: postgres.Sql): Promise<string[]> {
  const journal = journalSchema.parse(JSON.parse(await readAsset('meta/_journal.json')))
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`
  const [last] = await sql<{ created_at: string }[]>`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`
  const lastApplied = last ? Number(last.created_at) : -1

  const applied: string[] = []
  for (const entry of journal.entries) {
    if (entry.when <= lastApplied) continue
    const query = await readAsset(`${entry.tag}.sql`)
    const hash = createHash('sha256').update(query).digest('hex')
    const statements = query.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)
    // Explicit BEGIN/COMMIT because `sql` is a single reserved connection.
    await sql.unsafe('BEGIN')
    try {
      for (const statement of statements) await sql.unsafe(statement)
      await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`
      await sql.unsafe('COMMIT')
    } catch (error) {
      await sql.unsafe('ROLLBACK')
      throw error
    }
    applied.push(entry.tag)
  }
  return applied
}
