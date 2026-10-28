/**
 * Minimal RFC 5545 calendar generation for a single event.
 */

export interface IcsEvent {
  uid: string
  title: string
  description?: string
  location?: string
  url?: string
  start: Date
  end: Date
  /** DTSTAMP; defaults to now. Injectable for tests. */
  stamp?: Date
}

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Formats an instant as a UTC DATE-TIME, e.g. `20261112T173000Z`. */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Folds a content line to at most 75 octets per line (RFC 5545 §3.1), without
 * splitting multi-byte UTF-8 characters.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  let currentBytes = 0
  for (const ch of line) {
    const size = encoder.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // continuation lines start with a space
    if (currentBytes + size > limit) {
      out.push(current)
      current = ''
      currentBytes = 0
    }
    current += ch
    currentBytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

/**
 * Builds a complete VCALENDAR with one VEVENT. Times are written in UTC so every
 * calendar client shows them correctly in the reader's own zone.
 */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gather//events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(event.stamp ?? new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}
