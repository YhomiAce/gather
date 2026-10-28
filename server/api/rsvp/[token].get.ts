import { eq } from 'drizzle-orm'
import { events } from '../../database/schema'
import { getPublicEvent } from '../../services/events'
import { findRsvpByToken, waitlistPosition } from '../../services/rsvps'
import type { GuestRsvp } from '../../../shared/types/api'

/** A guest's own RSVP, looked up by their private token. */
export default defineEventHandler(async (event): Promise<GuestRsvp> => {
  const { token } = validateParams(event, tokenParamSchema)
  const db = await useReadyDb()
  const rsvp = await findRsvpByToken(db, token)
  if (!rsvp) throw createError({ statusCode: 404, statusMessage: 'RSVP not found' })
  const [row] = await db.select().from(events).where(eq(events.id, rsvp.eventId)).limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return {
    name: rsvp.name,
    email: rsvp.email,
    response: rsvp.response,
    status: rsvp.status,
    answer: rsvp.answer,
    waitlistPosition: await waitlistPosition(db, rsvp),
    event: { ...(await getPublicEvent(db, row)), location: row.location },
  }
})
