/**
 * Time-zone helpers built on `Intl` only (no date library). Event times are stored
 * as UTC instants plus the IANA time zone the host picked; these helpers convert
 * between the two and format them for humans.
 */

const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** Default locale for rendering dates; fixed so server and client output match. */
export const DISPLAY_LOCALE = 'en-GB'

/**
 * Returns true when `timeZone` is an IANA zone the runtime understands.
 *
 * @param timeZone - e.g. `Europe/Lagos`
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * Offset of `timeZone` from UTC at the given instant, in minutes (east positive).
 *
 * @param instant - the moment to evaluate (offsets change with DST)
 * @param timeZone - IANA zone name
 */
export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000
  return Math.round((asUtc - instantSeconds) / 60_000)
}

/**
 * Converts a wall-clock time (as produced by `<input type="datetime-local">`, e.g.
 * `2026-11-12T18:30`) in `timeZone` to the UTC instant it denotes.
 *
 * Times that fall in a DST gap are shifted forward by the gap, matching how most
 * calendar apps behave.
 *
 * @throws Error when the input is malformed or the zone is unknown
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = LOCAL_DATETIME_RE.exec(local)
  if (!m) throw new Error(`Invalid local date-time: ${local}`)
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown time zone: ${timeZone}`)
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number]
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  // First guess using the offset at the wall time, then correct once for DST transitions.
  const firstOffset = timeZoneOffsetMinutes(new Date(wall), timeZone)
  let utc = wall - firstOffset * 60_000
  const secondOffset = timeZoneOffsetMinutes(new Date(utc), timeZone)
  if (secondOffset !== firstOffset) utc = wall - secondOffset * 60_000
  return new Date(utc)
}

/**
 * Formats a UTC instant as the wall-clock value for a `datetime-local` input in `timeZone`.
 *
 * @returns e.g. `2026-11-12T18:30`
 */
export function utcToZonedLocal(instant: Date, timeZone: string): string {
  const shifted = new Date(instant.getTime() + timeZoneOffsetMinutes(instant, timeZone) * 60_000)
  return shifted.toISOString().slice(0, 16)
}

/**
 * Short zone label for an instant, e.g. `CET`, `GMT+1` or `WAT` depending on the runtime's ICU data.
 */
export function timeZoneLabel(instant: Date, timeZone: string, locale = DISPLAY_LOCALE): string {
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? timeZone
}

/**
 * Human-readable date and time range in the event's zone, e.g.
 * `Thu, 12 Nov 2026, 18:30 – 21:00 GMT`. Ranges over multiple days repeat the date.
 */
export function formatEventRange(start: Date, end: Date, timeZone: string, locale = DISPLAY_LOCALE): string {
  const dateFmt = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const label = timeZoneLabel(start, timeZone, locale)
  const startDate = dateFmt.format(start)
  const endDate = dateFmt.format(end)
  if (startDate === endDate) {
    return `${startDate}, ${timeFmt.format(start)} – ${timeFmt.format(end)} ${label}`
  }
  return `${startDate}, ${timeFmt.format(start)} – ${endDate}, ${timeFmt.format(end)} ${label}`
}

/**
 * Compact date for cards, e.g. `{ month: 'NOV', day: '12' }`, in the event's zone.
 */
export function calendarBadge(instant: Date, timeZone: string, locale = DISPLAY_LOCALE): { month: string; day: string } {
  const month = new Intl.DateTimeFormat(locale, { timeZone, month: 'short' }).format(instant).toUpperCase()
  const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(instant)
  return { month, day }
}
