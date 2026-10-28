<script setup lang="ts">
import type { Attendee, ManagedEvent } from '~~/shared/types/api'
import type { EventFormValues } from '~/components/EventForm.vue'

useSeoMeta({ title: 'Manage event · gather', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const route = useRoute()
const token = String(route.params.token)
const justCreated = route.query.created === '1'
const { data: event, error: loadError, refresh } = await useFetch<ManagedEvent>(`/api/manage/${token}`, { key: `manage-${token}` })
if (!event.value) throw pageLoadError(loadError.value, 'Manage link not found')

const siteUrl = useSiteUrl()
const manageUrl = `${siteUrl}/manage/${token}`
const publicUrl = computed(() => `${siteUrl}/e/${event.value?.slug}`)

const confirmed = computed(() => event.value?.attendees.filter((a) => a.status === 'confirmed') ?? [])
const going = computed(() => confirmed.value.filter((a) => a.response === 'going'))
const maybe = computed(() => confirmed.value.filter((a) => a.response === 'maybe'))
const notGoing = computed(() => confirmed.value.filter((a) => a.response === 'not_going'))
const waitlist = computed(() =>
  (event.value?.attendees.filter((a) => a.status === 'waitlisted') ?? []).sort((a, b) => (a.waitlistedAt ?? '').localeCompare(b.waitlistedAt ?? '')),
)
const cancelled = computed(() => event.value?.attendees.filter((a) => a.status === 'cancelled') ?? [])

const emailList = (list: Attendee[]): string => list.map((a) => `${a.name} <${a.email}>`).join(', ')
const goingEmails = computed(() => emailList(going.value))
const mailto = computed(() => `mailto:?bcc=${encodeURIComponent(going.value.map((a) => a.email).join(','))}&subject=${encodeURIComponent(event.value?.title ?? '')}`)

const formValues = computed<EventFormValues | null>(() => {
  const e = event.value
  if (!e) return null
  return {
    title: e.title,
    description: e.description,
    startsLocal: utcToZonedLocal(new Date(e.startsAt), e.timeZone),
    endsLocal: utcToZonedLocal(new Date(e.endsAt), e.timeZone),
    timeZone: e.timeZone,
    locationKind: e.locationKind,
    location: e.location,
    capacity: e.capacity,
    coverColor: e.coverColor,
    coverEmoji: e.coverEmoji ?? '',
    visibility: e.visibility,
    question: e.question ?? '',
    hostName: e.hostName,
    hostEmail: e.hostEmail ?? '',
    website: '',
  }
})

const editing = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function save(values: EventFormValues): Promise<void> {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/manage/${token}`, { method: 'PATCH', body: values })
    await refresh()
    editing.value = false
    notice.value = 'Event updated.'
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}

const responseLabel = { going: 'Going', maybe: 'Maybe', not_going: "Can't go" } as const
const fmt = (iso: string): string =>
  new Intl.DateTimeFormat(DISPLAY_LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: event.value?.timeZone }).format(new Date(iso))
</script>

<template>
  <div v-if="event" class="container stack">
    <div v-if="justCreated" class="alert info stack">
      <strong>Your event is live!</strong>
      <span>This page is your private manage link. Bookmark it: it's the only way to edit the event and see guests. We don't store it, only a hash of it.</span>
    </div>

    <div class="card stack">
      <div class="row" style="justify-content: space-between">
        <div>
          <span class="pill grey">Host dashboard</span>
          <h1 style="font-size: 1.6rem; margin-top: .5rem">{{ event.title }}</h1>
        </div>
        <div class="row">
          <NuxtLink :to="`/e/${event.slug}`" class="btn secondary small">View event page</NuxtLink>
          <button class="btn small" type="button" @click="editing = !editing">{{ editing ? 'Close editor' : 'Edit event' }}</button>
        </div>
      </div>
      <EventDetails :event="event" :location="event.location" />
      <PrivateLink :url="publicUrl" label="Share link (public)" />
      <PrivateLink :url="manageUrl" label="Your manage link (keep it private)" />
      <p v-if="notice" class="alert ok" role="status">{{ notice }}</p>
    </div>

    <EventForm v-if="editing && formValues" :initial="formValues" submit-label="Save changes" :busy="busy" :error="error" @submit="save" />

    <div class="card stack">
      <div class="stats">
        <div><strong>{{ going.length }}<span v-if="event.capacity" class="small muted"> / {{ event.capacity }}</span></strong><span class="small muted">going</span></div>
        <div><strong>{{ maybe.length }}</strong><span class="small muted">maybe</span></div>
        <div><strong>{{ notGoing.length }}</strong><span class="small muted">can't go</span></div>
        <div><strong>{{ waitlist.length }}</strong><span class="small muted">waitlist</span></div>
      </div>
      <div class="row">
        <a :href="`/api/manage/${token}/attendees.csv`" class="btn secondary small" download>⬇️ Export CSV</a>
        <CopyButton :text="goingEmails" label="📋 Copy guest emails" />
        <a :href="mailto" class="btn secondary small">✉️ Email guests</a>
      </div>
    </div>

    <div class="card stack">
      <h2 style="font-size: 1.15rem">Guests</h2>
      <div v-if="confirmed.length" class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Response</th><th v-if="event.question">{{ event.question }}</th><th>RSVPed</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in confirmed" :key="a.id">
              <td>{{ a.name }}</td>
              <td><a :href="`mailto:${a.email}`">{{ a.email }}</a></td>
              <td><span class="pill" :class="a.response === 'going' ? 'ok' : a.response === 'maybe' ? '' : 'grey'">{{ responseLabel[a.response] }}</span></td>
              <td v-if="event.question">{{ a.answer }}</td>
              <td class="muted">{{ fmt(a.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">No RSVPs yet. Share the event link to get started.</p>
    </div>

    <div class="card stack">
      <h2 style="font-size: 1.15rem">Waitlist</h2>
      <p class="small muted" style="margin: 0">When someone cancels, the first person here moves in automatically.</p>
      <div v-if="waitlist.length" class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Joined waitlist</th></tr></thead>
          <tbody>
            <tr v-for="(a, i) in waitlist" :key="a.id">
              <td>{{ i + 1 }}</td><td>{{ a.name }}</td><td>{{ a.email }}</td><td class="muted">{{ a.waitlistedAt ? fmt(a.waitlistedAt) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Nobody is waiting.</p>
      <details v-if="cancelled.length">
        <summary class="small muted">{{ cancelled.length }} cancelled</summary>
        <ul class="small"><li v-for="a in cancelled" :key="a.id">{{ a.name }} ({{ a.email }})</li></ul>
      </details>
    </div>
  </div>
</template>
