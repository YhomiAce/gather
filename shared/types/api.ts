/** JSON shapes returned by the API. Dates are ISO-8601 strings. */

export type Visibility = 'public' | 'unlisted'
export type LocationKind = 'venue' | 'online'
export type RsvpResponseValue = 'going' | 'maybe' | 'not_going'
export type RsvpStatusValue = 'confirmed' | 'waitlisted' | 'cancelled'

export interface EventCounts {
  going: number
  maybe: number
  notGoing: number
  waitlisted: number
}

export interface EventSummary {
  slug: string
  title: string
  startsAt: string
  endsAt: string
  timeZone: string
  locationKind: LocationKind
  /** Venue address, or "Online" for online events (the link is only shown to guests). */
  locationLabel: string
  capacity: number | null
  coverColor: string
  coverEmoji: string | null
  hostName: string
  counts: EventCounts
}

export interface PublicEvent extends EventSummary {
  descriptionHtml: string
  descriptionText: string
  visibility: Visibility
  question: string | null
  /** Seats left, or null when there is no capacity limit. */
  spotsLeft: number | null
  isPast: boolean
}

export interface Attendee {
  id: string
  name: string
  email: string
  response: RsvpResponseValue
  status: RsvpStatusValue
  answer: string | null
  createdAt: string
  waitlistedAt: string | null
}

export interface ManagedEvent extends PublicEvent {
  description: string
  location: string
  hostEmail: string | null
  attendees: Attendee[]
}

export interface GuestRsvp {
  name: string
  email: string
  response: RsvpResponseValue
  status: RsvpStatusValue
  answer: string | null
  /** 1-based position on the waitlist, when waitlisted. */
  waitlistPosition: number | null
  event: PublicEvent & { location: string }
}

export interface CreatedEvent {
  slug: string
  manageToken: string
}

export interface RsvpResult {
  status: RsvpStatusValue
  response: RsvpResponseValue
  token: string
}
