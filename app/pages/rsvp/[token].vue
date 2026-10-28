<script setup lang="ts">
import type { GuestRsvp, RsvpResponseValue } from '~~/shared/types/api'

useSeoMeta({ title: 'Your RSVP · gather', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const route = useRoute()
const token = String(route.params.token)
const { data: rsvp, error: loadError, refresh } = await useFetch<GuestRsvp>(`/api/rsvp/${token}`, { key: `rsvp-${token}` })
if (!rsvp.value) throw pageLoadError(loadError.value, 'RSVP not found')

const form = reactive({
  name: rsvp.value.name,
  response: (rsvp.value.status === 'cancelled' ? 'going' : rsvp.value.response) as RsvpResponseValue,
  answer: rsvp.value.answer ?? '',
})
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function save(): Promise<void> {
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await $fetch(`/api/rsvp/${token}`, { method: 'PATCH', body: form })
    await refresh()
    notice.value = 'Your RSVP was updated.'
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}

async function cancel(): Promise<void> {
  if (!window.confirm('Cancel your RSVP? Your spot may go to someone on the waitlist.')) return
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/rsvp/${token}`, { method: 'DELETE' })
    await refresh()
    notice.value = 'Your RSVP is cancelled.'
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}

const statusText = computed(() => {
  const r = rsvp.value
  if (!r) return ''
  if (r.status === 'cancelled') return 'Cancelled'
  if (r.status === 'waitlisted') return `On the waitlist (#${r.waitlistPosition})`
  return { going: 'Going', maybe: 'Maybe', not_going: "Can't go" }[r.response]
})
</script>

<template>
  <div v-if="rsvp" class="container narrow stack">
    <NuxtLink :to="`/e/${rsvp.event.slug}`" class="small">← Event page</NuxtLink>
    <div class="card stack">
      <div class="row" style="justify-content: space-between">
        <h1 style="font-size: 1.5rem; margin: 0">{{ rsvp.event.title }}</h1>
        <span class="pill" :class="rsvp.status === 'cancelled' ? 'danger' : rsvp.status === 'waitlisted' ? 'warn' : 'ok'">{{ statusText }}</span>
      </div>
      <EventDetails :event="rsvp.event" :location="rsvp.event.location" />
      <a :href="`/api/events/${rsvp.event.slug}/calendar.ics`" class="btn secondary small" style="align-self: start" download>📅 Add to calendar</a>
    </div>

    <form class="card stack" @submit.prevent="save">
      <h2 style="font-size: 1.15rem">{{ rsvp.status === 'cancelled' ? 'RSVP again' : 'Change your RSVP' }}</h2>
      <p class="small muted" style="margin: 0">Signed up as {{ rsvp.email }}</p>
      <RsvpFields v-model:name="form.name" v-model:response="form.response" v-model:answer="form.answer" :question="rsvp.event.question" />
      <p v-if="error" class="alert error" role="alert">{{ error }}</p>
      <p v-if="notice" class="alert ok" role="status">{{ notice }}</p>
      <div class="row">
        <button class="btn" type="submit" :disabled="busy || rsvp.event.isPast">Save</button>
        <button v-if="rsvp.status !== 'cancelled'" class="btn danger" type="button" :disabled="busy" @click="cancel">Cancel my RSVP</button>
      </div>
    </form>
  </div>
</template>
