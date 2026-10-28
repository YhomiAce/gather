/**
 * Runs pending migrations (and the first-run seed) as soon as the server starts,
 * so the first request doesn't pay for it. Request handlers also await the same
 * promise via `useReadyDb()`, so nothing is served from an unmigrated database.
 */
export default defineNitroPlugin((nitroApp) => {
  ensureDatabaseReady()
    .then(() => console.info('[gather] database ready'))
    .catch((error: unknown) => {
      console.error('[gather] database setup failed (will retry on next request):', error instanceof Error ? error.message : error)
    })

  nitroApp.hooks.hook('close', async () => {
    await closeDb()
  })
})
