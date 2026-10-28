import { z } from 'zod'
import { isValidTimeZone, zonedLocalToUtc } from '../../shared/utils/time'

const trimmed = (max: number) => z.string().trim().max(max)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

/** Hidden form field that real users never fill in. */
export const honeypot = z.string().max(500).optional()

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use the format YYYY-MM-DDTHH:mm')

/** Body for creating or editing an event. Times are wall-clock values in `timeZone`. */
export const eventInputSchema = z
  .object({
    title: trimmed(120).min(1, 'Title is required'),
    description: trimmed(10_000).default(''),
    startsLocal: localDateTime,
    endsLocal: localDateTime,
    timeZone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
    locationKind: z.enum(['venue', 'online']),
    location: trimmed(300).min(1, 'Location is required'),
    capacity: z.coerce.number().int().min(1).max(100_000).nullable().optional().transform((v) => v ?? null),
    coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #4f46e5').default('#4f46e5'),
    coverEmoji: optionalText(16),
    visibility: z.enum(['public', 'unlisted']).default('public'),
    question: optionalText(200),
    hostName: trimmed(80).min(1, 'Your name is required'),
    hostEmail: z.union([z.literal(''), z.email().max(200)]).optional().nullable().transform((v) => (v ? v.toLowerCase() : null)),
    website: honeypot,
  })
  .superRefine((v, ctx) => {
    if (v.locationKind === 'online' && !/^https?:\/\/\S+$/i.test(v.location)) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'Online events need an http(s) link' })
    }
  })
  .transform((v, ctx) => {
    let startsAt: Date
    let endsAt: Date
    try {
      startsAt = zonedLocalToUtc(v.startsLocal, v.timeZone)
      endsAt = zonedLocalToUtc(v.endsLocal, v.timeZone)
    } catch {
      ctx.addIssue({ code: 'custom', path: ['startsLocal'], message: 'Invalid date or time zone' })
      return z.NEVER
    }
    if (endsAt <= startsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsLocal'], message: 'End must be after start' })
      return z.NEVER
    }
    return { ...v, startsAt, endsAt }
  })

export type EventInput = z.output<typeof eventInputSchema>

const response = z.enum(['going', 'maybe', 'not_going'])

/** Body for a new RSVP. */
export const rsvpInputSchema = z.object({
  name: trimmed(80).min(1, 'Name is required'),
  email: z.email('Enter a valid email').max(200).transform((v) => v.toLowerCase()),
  response,
  answer: optionalText(1000),
  website: honeypot,
})

export type RsvpInput = z.output<typeof rsvpInputSchema>

/** Body for a guest changing their RSVP. */
export const rsvpUpdateSchema = z.object({
  name: trimmed(80).min(1, 'Name is required'),
  response,
  answer: optionalText(1000),
})

export type RsvpUpdate = z.output<typeof rsvpUpdateSchema>

/** Route param holding a guest or host token. */
export const tokenParamSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid link') })

/** Route param holding an event slug. */
export const slugParamSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/, 'Invalid event') })
