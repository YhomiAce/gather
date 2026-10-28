import { describe, expect, it } from 'vitest'
import { formatEventRange, isValidTimeZone, timeZoneOffsetMinutes, utcToZonedLocal, zonedLocalToUtc } from '../shared/utils/time'

describe('time zones', () => {
  it('validates IANA zone names', () => {
    expect(isValidTimeZone('Africa/Lagos')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })

  it('computes offsets including DST', () => {
    expect(timeZoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Berlin')).toBe(60)
    expect(timeZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Berlin')).toBe(120)
    expect(timeZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-240)
    expect(timeZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Asia/Kolkata')).toBe(330)
  })

  it('converts wall-clock time in a zone to UTC', () => {
    expect(zonedLocalToUtc('2026-11-12T18:30', 'Africa/Lagos').toISOString()).toBe('2026-11-12T17:30:00.000Z')
    expect(zonedLocalToUtc('2026-07-01T09:00', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z')
    expect(zonedLocalToUtc('2026-12-01T09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z')
  })

  it('handles the DST boundary days', () => {
    // Europe/London springs forward on 2026-03-29 at 01:00 UTC.
    expect(zonedLocalToUtc('2026-03-29T00:30', 'Europe/London').toISOString()).toBe('2026-03-29T00:30:00.000Z')
    expect(zonedLocalToUtc('2026-03-29T03:00', 'Europe/London').toISOString()).toBe('2026-03-29T02:00:00.000Z')
    // 01:30 doesn't exist that day; it is moved forward by the gap.
    expect(zonedLocalToUtc('2026-03-29T01:30', 'Europe/London').toISOString()).toBe('2026-03-29T01:30:00.000Z')
  })

  it('round-trips through the datetime-local format', () => {
    for (const tz of ['UTC', 'Europe/Berlin', 'America/Los_Angeles', 'Asia/Kathmandu', 'Australia/Adelaide']) {
      const local = '2026-11-12T18:30'
      expect(utcToZonedLocal(zonedLocalToUtc(local, tz), tz)).toBe(local)
    }
  })

  it('rejects bad input', () => {
    expect(() => zonedLocalToUtc('12/11/2026 18:30', 'UTC')).toThrow()
    expect(() => zonedLocalToUtc('2026-11-12T18:30', 'Nowhere/City')).toThrow()
  })

  it('formats a same-day range in the event zone', () => {
    const start = new Date('2026-11-12T17:30:00Z')
    const end = new Date('2026-11-12T20:00:00Z')
    expect(formatEventRange(start, end, 'Africa/Lagos')).toBe('Thu, 12 Nov 2026, 18:30 – 21:00 GMT+1')
    expect(formatEventRange(start, end, 'UTC')).toBe('Thu, 12 Nov 2026, 17:30 – 20:00 UTC')
  })

  it('shows both dates when the range crosses midnight in the event zone', () => {
    const start = new Date('2026-11-12T21:00:00Z')
    const end = new Date('2026-11-13T01:00:00Z')
    expect(formatEventRange(start, end, 'Europe/Berlin')).toBe('Thu, 12 Nov 2026, 22:00 – Fri, 13 Nov 2026, 02:00 CET')
  })
})
