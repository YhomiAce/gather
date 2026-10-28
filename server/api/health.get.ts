/** Liveness + database check. 200 when Postgres answers, 503 otherwise. */
export default defineEventHandler(async (event) => {
  try {
    await ensureDatabaseReady()
    await Promise.race([
      useSql()`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ])
    return { status: 'ok', db: 'up' }
  } catch {
    setResponseStatus(event, 503)
    return { status: 'error', db: 'down' }
  }
})
