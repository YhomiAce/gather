/**
 * Pure capacity / waitlist rules. The database code in `server/services/rsvps.ts`
 * runs these inside a transaction that holds a row lock on the event, so the
 * counts passed in are consistent.
 */

export type GuestResponse = 'going' | 'maybe' | 'not_going'
export type GuestStatus = 'confirmed' | 'waitlisted' | 'cancelled'

/**
 * Seats still free. `null` capacity means unlimited.
 *
 * @param capacity - max confirmed "going" guests, or null for no limit
 * @param confirmedGoing - confirmed "going" guests currently holding a seat
 */
export function seatsAvailable(capacity: number | null, confirmedGoing: number): number {
  if (capacity === null) return Number.POSITIVE_INFINITY
  return Math.max(0, capacity - confirmedGoing)
}

export interface StatusInput {
  /** What the guest is answering now. */
  response: GuestResponse
  /** The guest's previous state, if they already had an RSVP. */
  previous?: { response: GuestResponse; status: GuestStatus } | null
  capacity: number | null
  /** Confirmed "going" guests, *excluding* this guest. */
  confirmedGoingOthers: number
  /** Waitlisted guests, excluding this guest. */
  waitlistOthers: number
}

/**
 * Decides the status of an RSVP after the guest submits `response`.
 *
 * - Only "going" takes a seat; "maybe" and "can't go" are always confirmed.
 * - A guest who already holds a seat keeps it.
 * - A guest already on the waitlist stays there (keeps their place) unless a seat is free.
 * - Otherwise a seat is taken if one is free and nobody is waiting ahead; else waitlist.
 */
export function resolveStatus(input: StatusInput): Exclude<GuestStatus, 'cancelled'> {
  const { response, previous, capacity, confirmedGoingOthers, waitlistOthers } = input
  if (response !== 'going') return 'confirmed'
  if (previous && previous.status === 'confirmed' && previous.response === 'going') return 'confirmed'
  const free = seatsAvailable(capacity, confirmedGoingOthers)
  const wasWaitlisted = previous?.status === 'waitlisted'
  if (free > 0 && (waitlistOthers === 0 || wasWaitlisted)) return 'confirmed'
  return 'waitlisted'
}

export interface WaitlistEntry {
  id: string
  waitlistedAt: Date
}

/**
 * Picks which waitlisted guests to promote, first come first served.
 *
 * @returns ids to promote, in promotion order
 */
export function planPromotions(capacity: number | null, confirmedGoing: number, waitlist: readonly WaitlistEntry[]): string[] {
  const free = seatsAvailable(capacity, confirmedGoing)
  if (free <= 0 || waitlist.length === 0) return []
  return [...waitlist]
    .sort((a, b) => a.waitlistedAt.getTime() - b.waitlistedAt.getTime() || a.id.localeCompare(b.id))
    .slice(0, Number.isFinite(free) ? free : undefined)
    .map((w) => w.id)
}
