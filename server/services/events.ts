import { randomBytes } from 'node:crypto'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { events, rsvps, type EventRow, type RsvpRow } from '../database/schema'
import type { Db } from '../utils/db'
import { createToken, hashToken } from '../utils/tokens'
import { markdownToPlainText, renderMarkdown } from '../utils/markdown'
import { seatsAvailable } from '../utils/capacity'
import type { EventInput } from '../utils/validation'
import type { Attendee, EventCounts, EventSummary, ManagedEvent, PublicEvent } from '../../shared/types/api'
import { promoteFromWaitlist, type DbOrTx } from './rsvps'

/** Turns a title into a URL-safe slug with a short random suffix. */
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  const suffix = randomBytes(4).toString('hex').slice(0, 6)
  return base ? `${base}-${suffix}` : suffix
}

/** Counts RSVPs by bucket for each of the given events. */
export async function countsFor(db: DbOrTx, eventIds: string[]): Promise<Map<string, EventCounts>> {
  const result = new Map<string, EventCounts>()
  for (const id of eventIds) result.set(id, { going: 0, maybe: 0, notGoing: 0, waitlisted: 0 })
  if (eventIds.length === 0) return result
  const rows = await db
    .select({ eventId: rsvps.eventId, response: rsvps.response, status: rsvps.status, n: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(inArray(rsvps.eventId, eventIds))
    .groupBy(rsvps.eventId, rsvps.response, rsvps.status)
  for (const r of rows) {
    const c = result.get(r.eventId)
    if (!c) continue
    if (r.status === 'waitlisted') c.waitlisted += r.n
    else if (r.status === 'confirmed' && r.response === 'going') c.going += r.n
    else if (r.status === 'confirmed' && r.response === 'maybe') c.maybe += r.n
    else if (r.status === 'confirmed' && r.response === 'not_going') c.notGoing += r.n
  }
  return result
}

function toSummary(e: EventRow, counts: EventCounts): EventSummary {
  return {
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    timeZone: e.timeZone,
    locationKind: e.locationKind,
    locationLabel: e.locationKind === 'online' ? 'Online' : e.location,
    capacity: e.capacity,
    coverColor: e.coverColor,
    coverEmoji: e.coverEmoji,
    hostName: e.hostName,
    counts,
  }
}

/** Public view of an event (no host-only fields, online link hidden). */
export function toPublicEvent(e: EventRow, counts: EventCounts, now = new Date()): PublicEvent {
  const left = seatsAvailable(e.capacity, counts.going)
  return {
    ...toSummary(e, counts),
    descriptionHtml: renderMarkdown(e.description),
    descriptionText: markdownToPlainText(e.description),
    visibility: e.visibility,
    question: e.question,
    spotsLeft: Number.isFinite(left) ? left : null,
    isPast: e.endsAt.getTime() < now.getTime(),
  }
}

function toAttendee(r: RsvpRow): Attendee {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    response: r.response,
    status: r.status,
    answer: r.answer,
    createdAt: r.createdAt.toISOString(),
    waitlistedAt: r.waitlistedAt?.toISOString() ?? null,
  }
}

/** Upcoming (not yet ended) public events, soonest first. */
export async function listUpcomingPublicEvents(db: Db, limit = 50): Promise<EventSummary[]> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.visibility, 'public'), gte(events.endsAt, new Date())))
    .orderBy(asc(events.startsAt))
    .limit(limit)
  const counts = await countsFor(db, rows.map((r) => r.id))
  return rows.map((r) => toSummary(r, counts.get(r.id)!))
}

/** Finds an event by slug. */
export async function findEventBySlug(db: DbOrTx, slug: string): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
  return row
}

/** Finds an event by id. */
export async function findEventById(db: DbOrTx, id: string): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  return row
}

/** Finds an event by its plaintext manage token. */
export async function findEventByManageToken(db: DbOrTx, token: string): Promise<EventRow | undefined> {
  const [row] = await db.select().from(events).where(eq(events.manageTokenHash, hashToken(token))).limit(1)
  return row
}

/** Public event payload for the event page. */
export async function getPublicEvent(db: Db, row: EventRow): Promise<PublicEvent> {
  const counts = await countsFor(db, [row.id])
  return toPublicEvent(row, counts.get(row.id)!)
}

/** Host dashboard payload: the event plus every RSVP. */
export async function getManagedEvent(db: Db, row: EventRow): Promise<ManagedEvent> {
  const list = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.eventId, row.id))
    .orderBy(asc(rsvps.createdAt), asc(rsvps.id))
  const counts = await countsFor(db, [row.id])
  return {
    ...toPublicEvent(row, counts.get(row.id)!),
    description: row.description,
    location: row.location,
    hostEmail: row.hostEmail,
    attendees: list.map(toAttendee),
  }
}

function eventValues(input: EventInput) {
  return {
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timeZone: input.timeZone,
    locationKind: input.locationKind,
    location: input.location,
    capacity: input.capacity,
    coverColor: input.coverColor.toLowerCase(),
    coverEmoji: input.coverEmoji,
    visibility: input.visibility,
    question: input.question,
    hostName: input.hostName,
    hostEmail: input.hostEmail,
  }
}

/**
 * Creates an event.
 *
 * @returns the new slug and the plaintext manage token (shown once to the host)
 */
export async function createEvent(db: Db, input: EventInput): Promise<{ slug: string; manageToken: string }> {
  const { token, hash } = createToken()
  const slug = slugify(input.title)
  await db.insert(events).values({ ...eventValues(input), slug, manageTokenHash: hash })
  return { slug, manageToken: token }
}

/**
 * Updates an event. If the capacity grew (or was removed), waitlisted guests are
 * promoted in the same transaction.
 */
export async function updateEvent(db: Db, eventId: string, input: EventInput): Promise<void> {
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(events).where(eq(events.id, eventId)).for('update')
    if (!locked) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
    const [updated] = await tx
      .update(events)
      .set({ ...eventValues(input), updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning()
    await promoteFromWaitlist(tx, updated!)
  })
}
