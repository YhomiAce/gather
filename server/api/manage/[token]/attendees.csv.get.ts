import { getManagedEvent } from '../../../services/events'

const RESPONSE_LABEL = { going: 'Going', maybe: 'Maybe', not_going: "Can't go" } as const

/** Exports attendees and waitlist as CSV. */
export default defineEventHandler(async (event) => {
  const { db, row } = await requireManagedEvent(event)
  const data = await getManagedEvent(db, row)
  const header = ['Name', 'Email', 'Response', 'Status', row.question ?? 'Answer', 'RSVPed at']
  const rows = data.attendees.map((a) => [a.name, a.email, RESPONSE_LABEL[a.response], a.status, a.answer, a.createdAt])
  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${row.slug}-attendees.csv"`,
  })
  return toCsv(header, rows)
})
