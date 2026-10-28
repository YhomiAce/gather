import { describe, expect, it } from 'vitest'
import { planPromotions, resolveStatus, seatsAvailable } from '../server/utils/capacity'

describe('seatsAvailable', () => {
  it('is unlimited without a capacity', () => {
    expect(seatsAvailable(null, 500)).toBe(Number.POSITIVE_INFINITY)
  })
  it('never goes negative when over capacity', () => {
    expect(seatsAvailable(10, 4)).toBe(6)
    expect(seatsAvailable(3, 5)).toBe(0)
  })
})

describe('resolveStatus', () => {
  const base = { capacity: 2, confirmedGoingOthers: 0, waitlistOthers: 0 }

  it('confirms "going" while seats are free', () => {
    expect(resolveStatus({ ...base, response: 'going', confirmedGoingOthers: 1 })).toBe('confirmed')
  })

  it('waitlists "going" when the event is full', () => {
    expect(resolveStatus({ ...base, response: 'going', confirmedGoingOthers: 2 })).toBe('waitlisted')
  })

  it('never waitlists "maybe" or "can\'t go"', () => {
    expect(resolveStatus({ ...base, response: 'maybe', confirmedGoingOthers: 2 })).toBe('confirmed')
    expect(resolveStatus({ ...base, response: 'not_going', confirmedGoingOthers: 2 })).toBe('confirmed')
  })

  it('lets a confirmed guest keep their seat even if capacity was lowered', () => {
    const previous = { response: 'going', status: 'confirmed' } as const
    expect(resolveStatus({ ...base, capacity: 1, response: 'going', previous, confirmedGoingOthers: 3 })).toBe('confirmed')
  })

  it('does not let a newcomer jump ahead of the waitlist', () => {
    expect(resolveStatus({ ...base, response: 'going', confirmedGoingOthers: 1, waitlistOthers: 2 })).toBe('waitlisted')
  })

  it('a "maybe" switching to "going" on a full event is waitlisted', () => {
    const previous = { response: 'maybe', status: 'confirmed' } as const
    expect(resolveStatus({ ...base, response: 'going', previous, confirmedGoingOthers: 2 })).toBe('waitlisted')
  })
})

describe('planPromotions', () => {
  const t = (min: number): Date => new Date(Date.UTC(2026, 10, 1, 12, min))
  const waitlist = [
    { id: 'c', waitlistedAt: t(3) },
    { id: 'a', waitlistedAt: t(1) },
    { id: 'b', waitlistedAt: t(2) },
  ]

  it('promotes the first person on the waitlist when one seat frees up', () => {
    expect(planPromotions(5, 4, waitlist)).toEqual(['a'])
  })

  it('promotes several in order when capacity grows', () => {
    expect(planPromotions(5, 3, waitlist)).toEqual(['a', 'b'])
  })

  it('promotes everyone when capacity is removed', () => {
    expect(planPromotions(null, 99, waitlist)).toEqual(['a', 'b', 'c'])
  })

  it('promotes nobody while the event is still full', () => {
    expect(planPromotions(5, 5, waitlist)).toEqual([])
    expect(planPromotions(5, 7, waitlist)).toEqual([])
  })

  it('breaks ties on id so the order is deterministic', () => {
    expect(planPromotions(1, 0, [{ id: 'z', waitlistedAt: t(1) }, { id: 'y', waitlistedAt: t(1) }])).toEqual(['y'])
  })
})
