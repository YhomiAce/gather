<script setup lang="ts">
import type { PublicEvent, RsvpResponseValue, RsvpResult } from '~~/shared/types/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data: event, error: loadError, refresh } = await useFetch<PublicEvent>(() => `/api/events/${slug.value}`)
if (!event.value) throw pageLoadError(loadError.value, 'Event not found')

const siteUrl = useSiteUrl()
const pageUrl = computed(() => `${siteUrl}/e/${slug.value}`)
const when = computed(() =>
  event.value ? formatEventRange(new Date(event.value.startsAt), new Date(event.value.endsAt), event.value.timeZone) : '',
)
const metaDescription = computed(() => {
  const e = event.value
  if (!e) return ''
  return `${when.value} · ${e.locationLabel}. ${e.descriptionText}`.slice(0, 300)
})

useSeoMeta({
  title: () => `${event.value?.title} · gather`,
  description: metaDescription,
  ogTitle: () => event.value?.title ?? 'gather',
  ogDescription: metaDescription,
  ogType: 'website',
  ogUrl: pageUrl,
  ogSiteName: 'gather',
  twitterCard: 'summary',
  twitterTitle: () => event.value?.title ?? 'gather',
  twitterDescription: metaDescription,
  robots: () => (event.value?.visibility === 'unlisted' ? 'noindex, nofollow' : 'index, follow'),
})
useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.value?.title,
          startDate: event.value?.startsAt,
          endDate: event.value?.endsAt,
          eventAttendanceMode:
            event.value?.locationKind === 'online' ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
          location: event.value?.locationKind === 'online' ? { '@type': 'VirtualLocation', url: pageUrl.value } : { '@type': 'Place', name: event.value?.locationLabel, address: event.value?.locationLabel },
          organizer: { '@type': 'Person', name: event.value?.hostName },
          url: pageUrl.value,
        }).replace(/</g, '\\u003c'),
    },
  ],
})

const form = reactive({ name: '', email: '', response: 'going' as RsvpResponseValue, answer: '', website: '' })
const busy = ref(false)
const error = ref<string | null>(null)
const result = ref<RsvpResult | null>(null)
const guestUrl = computed(() => (result.value ? `${siteUrl}/rsvp/${result.value.token}` : ''))
const isFull = computed(() => event.value?.spotsLeft === 0)

async function submit(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    result.value = await $fetch<RsvpResult>(`/api/events/${slug.value}/rsvps`, { method: 'POST', body: form })
    await refresh()
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="event" class="container">
    <EventCover :color="event.coverColor" :emoji="event.coverEmoji" large />
    <div class="event-layout" style="margin-top: 1.5rem">
      <article class="stack">
        <div class="row">
          <span v-if="event.visibility === 'unlisted'" class="pill grey">Unlisted</span>
          <span v-if="event.isPast" class="pill grey">This event has ended</span>
        </div>
        <h1 style="font-size: 2rem">{{ event.title }}</h1>
        <EventDetails :event="event" />
        <div class="row">
          <a :href="`/api/events/${event.slug}/calendar.ics`" class="btn secondary small" download>📅 Add to calendar (.ics)</a>
          <CopyButton :text="pageUrl" label="🔗 Copy link" />
        </div>
        <!-- descriptionHtml is sanitised on the server (raw HTML escaped, unsafe links dropped). -->
        <div v-if="event.descriptionHtml" class="card prose" v-html="event.descriptionHtml" />
      </article>

      <aside class="card stack">
        <div class="stats" style="grid-template-columns: repeat(3, 1fr)">
          <div><strong>{{ event.counts.going }}</strong><span class="small muted">going</span></div>
          <div><strong>{{ event.counts.maybe }}</strong><span class="small muted">maybe</span></div>
          <div>
            <strong>{{ event.spotsLeft ?? '∞' }}</strong><span class="small muted">spots left</span>
          </div>
        </div>
        <p v-if="event.counts.waitlisted" class="small muted" style="margin: 0">{{ event.counts.waitlisted }} on the waitlist</p>

        <div v-if="result" class="stack" role="status">
          <p v-if="result.status === 'waitlisted'" class="alert warn">The event is full, so you're on the waitlist. If a spot opens up you'll move in automatically.</p>
          <p v-else-if="result.response === 'going'" class="alert ok">You're going! See you there.</p>
          <p v-else class="alert ok">Thanks, your response is saved.</p>
          <PrivateLink :url="guestUrl" label="Your private RSVP link" />
          <p class="small muted">Bookmark this link to change or cancel your RSVP, or to see the online link. Anyone with it can edit your RSVP.</p>
          <NuxtLink :to="`/rsvp/${result.token}`" class="btn secondary">Open my RSVP</NuxtLink>
        </div>

        <p v-else-if="event.isPast" class="muted">RSVPs are closed.</p>

        <form v-else class="stack" @submit.prevent="submit">
          <h2 style="font-size: 1.15rem">RSVP</h2>
          <p v-if="isFull" class="alert warn small">This event is full. RSVP "Going" to join the waitlist.</p>
          <RsvpFields v-model:name="form.name" v-model:email="form.email" v-model:response="form.response" v-model:answer="form.answer" :question="event.question" show-email />
          <div class="hp" aria-hidden="true">
            <label for="rsvp-website">Leave this empty</label>
            <input id="rsvp-website" v-model="form.website" tabindex="-1" autocomplete="off" />
          </div>
          <p v-if="error" class="alert error" role="alert">{{ error }}</p>
          <button class="btn" type="submit" :disabled="busy">
            {{ busy ? 'Saving…' : isFull && form.response === 'going' ? 'Join the waitlist' : 'Send RSVP' }}
          </button>
        </form>
      </aside>
    </div>
  </div>
</template>
