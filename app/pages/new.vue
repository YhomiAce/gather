<script setup lang="ts">
import type { CreatedEvent } from '~~/shared/types/api'
import type { EventFormValues } from '~/components/EventForm.vue'

useSeoMeta({ title: 'Create an event · gather', robots: 'noindex' })

const busy = ref(false)
const error = ref<string | null>(null)

/** Next Thursday 18:30 to 21:00 as a sensible default. */
function defaultTimes(): { startsLocal: string; endsLocal: string } {
  const d = new Date()
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7))
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { startsLocal: `${day}T18:30`, endsLocal: `${day}T21:00` }
}

const initial: EventFormValues = {
  title: '',
  description: '',
  ...defaultTimes(),
  timeZone: 'UTC',
  locationKind: 'venue',
  location: '',
  capacity: null,
  coverColor: '#4f46e5',
  coverEmoji: '🎉',
  visibility: 'public',
  question: '',
  hostName: '',
  hostEmail: '',
  website: '',
}
const formKey = ref(0)
onMounted(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (tz && tz !== initial.timeZone) {
    initial.timeZone = tz
    formKey.value++
  }
})

async function create(values: EventFormValues): Promise<void> {
  busy.value = true
  error.value = null
  try {
    const res = await $fetch<CreatedEvent>('/api/events', { method: 'POST', body: values })
    await navigateTo(`/manage/${res.manageToken}?created=1`)
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container narrow">
    <h1>Create an event</h1>
    <p class="muted">No account needed. You'll get a private link to manage your event.</p>
    <EventForm :key="formKey" :initial="initial" submit-label="Create event" :busy="busy" :error="error" @submit="create" />
  </div>
</template>
