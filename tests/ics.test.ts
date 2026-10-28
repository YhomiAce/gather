import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, foldIcsLine, formatIcsDate } from '../server/utils/ics'

describe('ics', () => {
  const event = {
    uid: 'abc@gather',
    title: 'Meetup; talks, pizza',
    description: 'Line one\nLine two',
    location: 'Hall 1, Main St',
    url: 'https://gather.example/e/meetup',
    start: new Date('2026-11-12T17:30:00Z'),
    end: new Date('2026-11-12T20:00:00Z'),
    stamp: new Date('2026-10-28T09:00:00.123Z'),
  }

  it('formats UTC date-times', () => {
    expect(formatIcsDate(new Date('2026-11-12T17:30:00.000Z'))).toBe('20261112T173000Z')
  })

  it('escapes special characters', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\;b\\,c\\\\d\\ne')
  })

  it('builds a valid VCALENDAR with CRLF line endings', () => {
    const ics = buildIcs(event)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261112T173000Z\r\n')
    expect(ics).toContain('DTEND:20261112T200000Z\r\n')
    expect(ics).toContain('DTSTAMP:20261028T090000Z\r\n')
    expect(ics).toContain('SUMMARY:Meetup\; talks\\, pizza\r\n')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\r\n')
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/)
  })

  it('folds long lines at 75 octets without splitting multi-byte characters', () => {
    const line = `SUMMARY:${'é'.repeat(100)}`
    const folded = foldIcsLine(line)
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true)
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line)
  })
})
