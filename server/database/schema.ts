import { relations, sql } from 'drizzle-orm'
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const visibilityEnum = pgEnum('event_visibility', ['public', 'unlisted'])
export const locationKindEnum = pgEnum('location_kind', ['venue', 'online'])
export const rsvpResponseEnum = pgEnum('rsvp_response', ['going', 'maybe', 'not_going'])
export const rsvpStatusEnum = pgEnum('rsvp_status', ['confirmed', 'waitlisted', 'cancelled'])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    timeZone: text('time_zone').notNull(),
    locationKind: locationKindEnum('location_kind').notNull(),
    location: text('location').notNull(),
    capacity: integer('capacity'),
    coverColor: text('cover_color').notNull().default('#4f46e5'),
    coverEmoji: text('cover_emoji'),
    visibility: visibilityEnum('visibility').notNull().default('public'),
    question: text('question'),
    hostName: text('host_name').notNull(),
    hostEmail: text('host_email'),
    manageTokenHash: text('manage_token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('events_slug_idx').on(t.slug),
    uniqueIndex('events_manage_token_idx').on(t.manageTokenHash),
    index('events_public_upcoming_idx').on(t.visibility, t.startsAt),
    check('events_capacity_positive', sql`${t.capacity} IS NULL OR ${t.capacity} > 0`),
    check('events_ends_after_start', sql`${t.endsAt} > ${t.startsAt}`),
  ],
)

export const rsvps = pgTable(
  'rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    response: rsvpResponseEnum('response').notNull(),
    status: rsvpStatusEnum('status').notNull(),
    answer: text('answer'),
    tokenHash: text('token_hash').notNull(),
    /** When the guest joined the waitlist; orders promotion (first in, first promoted). */
    waitlistedAt: timestamp('waitlisted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('rsvps_event_email_idx').on(t.eventId, t.email),
    uniqueIndex('rsvps_token_idx').on(t.tokenHash),
    index('rsvps_event_status_idx').on(t.eventId, t.status, t.waitlistedAt),
  ],
)

export const eventsRelations = relations(events, ({ many }) => ({ rsvps: many(rsvps) }))
export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
}))

export type EventRow = typeof events.$inferSelect
export type NewEventRow = typeof events.$inferInsert
export type RsvpRow = typeof rsvps.$inferSelect
export type RsvpResponse = (typeof rsvpResponseEnum.enumValues)[number]
export type RsvpStatus = (typeof rsvpStatusEnum.enumValues)[number]
