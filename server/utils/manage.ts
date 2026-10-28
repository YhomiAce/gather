import type { H3Event } from 'h3'
import type { EventRow } from '../database/schema'
import { findEventByManageToken } from '../services/events'
import type { Db } from './db'

/**
 * Resolves the event for a host manage link, or throws 404.
 * Responses are marked private so proxies never cache host data.
 */
export async function requireManagedEvent(event: H3Event): Promise<{ db: Db; row: EventRow }> {
  const { token } = validateParams(event, tokenParamSchema)
  const db = await useReadyDb()
  const row = await findEventByManageToken(db, token)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Manage link not found' })
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { db, row }
}
