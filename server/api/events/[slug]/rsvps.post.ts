import { findEventBySlug } from '../../../services/events'
import { createRsvp } from '../../../services/rsvps'
import type { RsvpResult } from '../../../../shared/types/api'

/** RSVP to an event. Returns the guest's status and private token. */
export default defineEventHandler(async (event): Promise<RsvpResult> => {
  enforceRsvpRateLimit(event)
  const { slug } = validateParams(event, slugParamSchema)
  const body = await validateBody(event, rsvpInputSchema)
  if (isHoneypotTripped(body)) {
    return { status: 'confirmed', response: body.response, token: createToken().token }
  }
  const db = await useReadyDb()
  const row = await findEventBySlug(db, slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  setResponseStatus(event, 201)
  return createRsvp(db, row.id, body)
})
