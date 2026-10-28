import { sql } from 'drizzle-orm'
import { events, rsvps } from '../database/schema'
import type { Db } from './db'
import { createToken } from './tokens'
import { zonedLocalToUtc, utcToZonedLocal } from '../../shared/utils/time'

interface SeedEvent {
  title: string
  slug: string
  daysFromNow: number
  startTime: string
  hours: number
  timeZone: string
  locationKind: 'venue' | 'online'
  location: string
  capacity: number | null
  coverColor: string
  coverEmoji: string
  question: string | null
  hostName: string
  description: string
  guests: [name: string, response: 'going' | 'maybe' | 'not_going'][]
}

const SAMPLE_EVENTS: SeedEvent[] = [
  {
    title: 'Lagos JS Meetup: Edge runtimes in practice',
    slug: 'lagos-js-edge-runtimes',
    daysFromNow: 6,
    startTime: '18:00',
    hours: 3,
    timeZone: 'Africa/Lagos',
    locationKind: 'venue',
    location: 'Co-Creation Hub, 294 Herbert Macaulay Way, Yaba, Lagos',
    capacity: 6,
    coverColor: '#f59e0b',
    coverEmoji: '⚡',
    question: 'What would you like to learn about edge runtimes?',
    hostName: 'Adaeze Okafor',
    description:
      '## Edge runtimes in practice\n\nTwo short talks and plenty of time to chat:\n\n- **Shipping to the edge without rewriting your app**\n- **Caching patterns that actually work**\n\nPizza and drinks provided. Bring a laptop if you want to follow along.',
    guests: [
      ['Tunde Bakare', 'going'],
      ['Ngozi Eze', 'going'],
      ['Femi Adeyemi', 'going'],
      ['Chioma Nwosu', 'going'],
      ['Ibrahim Musa', 'going'],
      ['Kemi Alabi', 'going'],
      ['Seyi Ogun', 'going'],
      ['Bola Ade', 'maybe'],
    ],
  },
  {
    title: 'Remote Product Book Club: "Shape Up"',
    slug: 'book-club-shape-up',
    daysFromNow: 10,
    startTime: '17:30',
    hours: 1.5,
    timeZone: 'Europe/London',
    locationKind: 'online',
    location: 'https://meet.example.com/gather-book-club',
    capacity: null,
    coverColor: '#10b981',
    coverEmoji: '📚',
    question: null,
    hostName: 'Priya Shah',
    description:
      'We are discussing chapters 1–6 of *Shape Up* by Ryan Singer. [Read it free online](https://basecamp.com/shapeup).\n\nCameras optional, opinions encouraged.',
    guests: [
      ['Oliver Grant', 'going'],
      ['Amara Johnson', 'going'],
      ['Lucas Meyer', 'maybe'],
      ['Sofia Rossi', 'not_going'],
    ],
  },
  {
    title: 'Saturday Morning Trail Run',
    slug: 'saturday-trail-run',
    daysFromNow: 13,
    startTime: '07:00',
    hours: 2,
    timeZone: 'America/New_York',
    locationKind: 'venue',
    location: 'Prospect Park, Grand Army Plaza entrance, Brooklyn',
    capacity: 20,
    coverColor: '#0ea5e9',
    coverEmoji: '🏃',
    question: 'Which distance: 5k or 10k?',
    hostName: 'Marcus Lee',
    description: 'An easy-paced social run. Two groups (5k and 10k), coffee afterwards at the plaza. All paces welcome!',
    guests: [
      ['Jordan Kim', 'going'],
      ['Ava Thompson', 'going'],
      ['Diego Ramirez', 'going'],
      ['Hannah Cole', 'maybe'],
    ],
  },
  {
    title: 'Design Systems Roundtable',
    slug: 'design-systems-roundtable',
    daysFromNow: 20,
    startTime: '19:00',
    hours: 2,
    timeZone: 'Europe/Berlin',
    locationKind: 'venue',
    location: 'Factory Berlin, Rheinsberger Str. 76/77, 10115 Berlin',
    capacity: 30,
    coverColor: '#8b5cf6',
    coverEmoji: '🎨',
    question: 'Which design tool does your team use?',
    hostName: 'Lena Fischer',
    description:
      'An informal roundtable for designers and engineers who maintain design systems.\n\n1. Tokens and theming\n2. Versioning components\n3. Getting adoption across teams',
    guests: [
      ['Jonas Weber', 'going'],
      ['Mia Schulz', 'going'],
      ['Elif Yilmaz', 'maybe'],
    ],
  },
]

const emailFor = (name: string): string => `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`

/**
 * Inserts sample public events (dated relative to today) with RSVPs when the
 * events table is empty. Idempotent: does nothing once any event exists.
 *
 * @returns number of events inserted
 */
export async function seedIfEmpty(db: Db): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(events)
  if ((row?.n ?? 0) > 0) return 0

  await db.transaction(async (tx) => {
    for (const s of SAMPLE_EVENTS) {
      const day = utcToZonedLocal(new Date(Date.now() + s.daysFromNow * 86_400_000), s.timeZone).slice(0, 10)
      const startsAt = zonedLocalToUtc(`${day}T${s.startTime}`, s.timeZone)
      const endsAt = new Date(startsAt.getTime() + s.hours * 3_600_000)
      const manage = createToken()
      const [ev] = await tx
        .insert(events)
        .values({
          slug: s.slug,
          title: s.title,
          description: s.description,
          startsAt,
          endsAt,
          timeZone: s.timeZone,
          locationKind: s.locationKind,
          location: s.location,
          capacity: s.capacity,
          coverColor: s.coverColor,
          coverEmoji: s.coverEmoji,
          visibility: 'public',
          question: s.question,
          hostName: s.hostName,
          manageTokenHash: manage.hash,
        })
        .returning({ id: events.id })

      let seats = 0
      for (const [i, [name, response]] of s.guests.entries()) {
        const takesSeat = response === 'going' && (s.capacity === null || seats < s.capacity)
        if (takesSeat) seats += 1
        const status = response === 'going' && !takesSeat ? 'waitlisted' : 'confirmed'
        const at = new Date(Date.now() - (s.guests.length - i) * 60_000)
        await tx.insert(rsvps).values({
          eventId: ev!.id,
          name,
          email: emailFor(name),
          response,
          status,
          answer: s.question && response !== 'not_going' ? 'Looking forward to it!' : null,
          tokenHash: createToken().hash,
          waitlistedAt: status === 'waitlisted' ? at : null,
          createdAt: at,
        })
      }
      console.info(`[gather] seeded "${s.title}" (manage link: /manage/${manage.token})`)
    }
  })
  return SAMPLE_EVENTS.length
}
