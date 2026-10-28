import { findEventById, getManagedEvent, updateEvent } from '../../../services/events'

/** Edits the event. Raising the capacity promotes waitlisted guests. */
export default defineEventHandler(async (event) => {
  const { db, row } = await requireManagedEvent(event)
  const body = await validateBody(event, eventInputSchema)
  await updateEvent(db, row.id, body)
  const fresh = await findEventById(db, row.id)
  if (!fresh) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return getManagedEvent(db, fresh)
})
