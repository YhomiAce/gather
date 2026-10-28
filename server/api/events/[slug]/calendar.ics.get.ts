import { findEventBySlug } from '../../../services/events'
import { markdownToPlainText } from '../../../utils/markdown'

/** Downloads the event as an iCalendar file. */
export default defineEventHandler(async (event) => {
  const { slug } = validateParams(event, slugParamSchema)
  const row = await findEventBySlug(await useReadyDb(), slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  const url = `${siteUrl(event)}/e/${row.slug}`
  const body = buildIcs({
    uid: `${row.id}@gather`,
    title: row.title,
    description: `${markdownToPlainText(row.description, 1000)}\n\nHosted by ${row.hostName}\n${url}`.trim(),
    // Online links are shared only with guests, so the public file points at the event page.
    location: row.locationKind === 'venue' ? row.location : url,
    url,
    start: row.startsAt,
    end: row.endsAt,
    stamp: row.updatedAt,
  })
  setResponseHeaders(event, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${row.slug}.ics"`,
    'Cache-Control': 'no-cache',
  })
  return body
})
