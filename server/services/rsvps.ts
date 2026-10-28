import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { events, rsvps, type EventRow, type RsvpRow } from '../database/schema'
import type { Db } from '../utils/db'
import { planPromotions, resolveStatus } from '../utils/capacity'
import { createToken, hashToken } from '../utils/tokens'
import type { RsvpInput, RsvpUpdate } from '../utils/validation'
import type { RsvpResponseValue, RsvpStatusValue } from '../../shared/types/api'

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx

/** Locks the event row for the rest of the transaction; serialises seat allocation. */
async function lockEvent(tx: Tx, eventId: string): Promise<EventRow> {
  const [row] = await tx.select().from(events).where(eq(events.id, eventId)).for('update')
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  return row
}

async function seatCounts(tx: Tx, eventId: string, excludeRsvpId?: string): Promise<{ going: number; waitlisted: number }> {
  const [row] = await tx
    .select({
      going: sql<number>`count(*) FILTER (WHERE ${rsvps.status} = 'confirmed' AND ${rsvps.response} = 'going')::int`,
      waitlisted: sql<number>`count(*) FILTER (WHERE ${rsvps.status} = 'waitlisted')::int`,
    })
    .from(rsvps)
    .where(excludeRsvpId ? and(eq(rsvps.eventId, eventId), ne(rsvps.id, excludeRsvpId)) : eq(rsvps.eventId, eventId))
  return { going: row?.going ?? 0, waitlisted: row?.waitlisted ?? 0 }
}

/**
 * Promotes waitlisted guests into free seats, oldest first. Call inside a
 * transaction that holds the event lock.
 *
 * @returns ids of promoted RSVPs
 */
export async function promoteFromWaitlist(tx: Tx, event: EventRow): Promise<string[]> {
  const { going } = await seatCounts(tx, event.id)
  const waitlist = await tx
    .select({ id: rsvps.id, waitlistedAt: rsvps.waitlistedAt })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, event.id), eq(rsvps.status, 'waitlisted')))
    .orderBy(asc(rsvps.waitlistedAt), asc(rsvps.id))
  const ids = planPromotions(
    event.capacity,
    going,
    waitlist.map((w) => ({ id: w.id, waitlistedAt: w.waitlistedAt ?? new Date(0) })),
  )
  const now = new Date()
  for (const id of ids) {
    await tx.update(rsvps).set({ status: 'confirmed', waitlistedAt: null, updatedAt: now }).where(eq(rsvps.id, id))
  }
  return ids
}

export interface RsvpOutcome {
  status: RsvpStatusValue
  response: RsvpResponseValue
  token: string
}

/**
 * Records a new RSVP. When the event is full, "going" guests join the waitlist.
 * A guest who previously cancelled can RSVP again (they get a fresh link).
 */
export async function createRsvp(db: Db, eventId: string, input: RsvpInput): Promise<RsvpOutcome> {
  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId)
    if (event.endsAt.getTime() < Date.now()) throw createError({ statusCode: 409, statusMessage: 'This event has already ended' })

    const [existing] = await tx
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.email, input.email)))
      .limit(1)
    if (existing && existing.status !== 'cancelled') {
      throw createError({
        statusCode: 409,
        statusMessage: 'This email has already RSVPed. Use your private RSVP link to change it.',
      })
    }

    const counts = await seatCounts(tx, eventId, existing?.id)
    const status = resolveStatus({
      response: input.response,
      previous: null,
      capacity: event.capacity,
      confirmedGoingOthers: counts.going,
      waitlistOthers: counts.waitlisted,
    })
    const { token, hash } = createToken()
    const now = new Date()
    const values = {
      name: input.name,
      response: input.response,
      status,
      answer: input.answer,
      tokenHash: hash,
      waitlistedAt: status === 'waitlisted' ? now : null,
      updatedAt: now,
    }
    if (existing) {
      await tx.update(rsvps).set({ ...values, createdAt: now }).where(eq(rsvps.id, existing.id))
    } else {
      await tx.insert(rsvps).values({ ...values, eventId, email: input.email })
    }
    return { status, response: input.response, token }
  })
}

/** Finds an RSVP by its plaintext guest token. */
export async function findRsvpByToken(db: DbOrTx, token: string): Promise<RsvpRow | undefined> {
  const [row] = await db.select().from(rsvps).where(eq(rsvps.tokenHash, hashToken(token))).limit(1)
  return row
}

async function lockedRsvp(tx: Tx, token: string): Promise<{ event: EventRow; rsvp: RsvpRow }> {
  const found = await findRsvpByToken(tx, token)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'RSVP not found' })
  // Lock order is always event first, then RSVP rows, to avoid deadlocks.
  const event = await lockEvent(tx, found.eventId)
  const [rsvp] = await tx.select().from(rsvps).where(eq(rsvps.id, found.id)).for('update')
  if (!rsvp) throw createError({ statusCode: 404, statusMessage: 'RSVP not found' })
  return { event, rsvp }
}

/**
 * Changes a guest's RSVP. Freed seats go to the waitlist in the same transaction.
 */
export async function updateRsvp(db: Db, token: string, input: RsvpUpdate): Promise<RsvpOutcome> {
  return db.transaction(async (tx) => {
    const { event, rsvp } = await lockedRsvp(tx, token)
    const counts = await seatCounts(tx, event.id, rsvp.id)
    const previous = rsvp.status === 'cancelled' ? null : { response: rsvp.response, status: rsvp.status }
    const status = resolveStatus({
      response: input.response,
      previous,
      capacity: event.capacity,
      confirmedGoingOthers: counts.going,
      waitlistOthers: counts.waitlisted,
    })
    const now = new Date()
    const waitlistedAt = status === 'waitlisted' ? (rsvp.status === 'waitlisted' ? rsvp.waitlistedAt : now) : null
    await tx
      .update(rsvps)
      .set({ name: input.name, response: input.response, answer: input.answer, status, waitlistedAt, updatedAt: now })
      .where(eq(rsvps.id, rsvp.id))
    await promoteFromWaitlist(tx, event)
    return { status, response: input.response, token }
  })
}

/**
 * Cancels a guest's RSVP and promotes the first waitlisted guest if a seat was freed.
 *
 * @returns ids of promoted RSVPs
 */
export async function cancelRsvp(db: Db, token: string): Promise<string[]> {
  return db.transaction(async (tx) => {
    const { event, rsvp } = await lockedRsvp(tx, token)
    if (rsvp.status === 'cancelled') return []
    await tx.update(rsvps).set({ status: 'cancelled', waitlistedAt: null, updatedAt: new Date() }).where(eq(rsvps.id, rsvp.id))
    return promoteFromWaitlist(tx, event)
  })
}

/** 1-based waitlist position of an RSVP, or null if not waitlisted. */
export async function waitlistPosition(db: DbOrTx, rsvp: RsvpRow): Promise<number | null> {
  if (rsvp.status !== 'waitlisted' || !rsvp.waitlistedAt) return null
  const [row] = await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(
      and(
        eq(rsvps.eventId, rsvp.eventId),
        eq(rsvps.status, 'waitlisted'),
        sql`(${rsvps.waitlistedAt}, ${rsvps.id}) < (${rsvp.waitlistedAt.toISOString()}::timestamptz, ${rsvp.id}::uuid)`,
      ),
    )
  return (row?.ahead ?? 0) + 1
}
