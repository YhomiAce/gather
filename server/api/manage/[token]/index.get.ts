import { getManagedEvent } from '../../../services/events'

/** Host dashboard data: event details plus attendees and waitlist. */
export default defineEventHandler(async (event) => {
  const { db, row } = await requireManagedEvent(event)
  return getManagedEvent(db, row)
})
