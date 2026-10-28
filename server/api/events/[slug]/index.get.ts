import { findEventBySlug, getPublicEvent } from '../../../services/events'

/** Public details of one event. */
export default defineEventHandler(async (event) => {
  const { slug } = validateParams(event, slugParamSchema)
  const db = await useReadyDb()
  const row = await findEventBySlug(db, slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return getPublicEvent(db, row)
})
