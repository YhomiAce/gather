<script setup lang="ts">
import type { PublicEvent } from '~~/shared/types/api'

const props = defineProps<{ event: PublicEvent; location?: string }>()
const start = computed(() => new Date(props.event.startsAt))
const when = computed(() => formatEventRange(start.value, new Date(props.event.endsAt), props.event.timeZone))

// Shown only after hydration: the reader's own zone is unknown on the server.
const localWhen = ref<string | null>(null)
onMounted(() => {
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (mine && mine !== props.event.timeZone && timeZoneOffsetMinutes(start.value, mine) !== timeZoneOffsetMinutes(start.value, props.event.timeZone)) {
    localWhen.value = formatEventRange(start.value, new Date(props.event.endsAt), mine, navigator.language || DISPLAY_LOCALE)
  }
})
const isLink = computed(() => !!props.location && /^https?:\/\//.test(props.location))
</script>

<template>
  <ul class="detail-list">
    <li>
      <span class="icon">🗓️</span>
      <div>
        <div>{{ when }}</div>
        <div class="muted small">{{ event.timeZone.replace(/_/g, ' ') }}</div>
        <div v-if="localWhen" class="muted small">Your time: {{ localWhen }}</div>
      </div>
    </li>
    <li>
      <span class="icon">{{ event.locationKind === 'online' ? '💻' : '📍' }}</span>
      <div>
        <a v-if="isLink" :href="location" target="_blank" rel="noopener">{{ location }}</a>
        <span v-else>{{ location || event.locationLabel }}</span>
        <div v-if="event.locationKind === 'online' && !location" class="muted small">Link shared after you RSVP</div>
      </div>
    </li>
    <li>
      <span class="icon">👤</span>
      <div>Hosted by {{ event.hostName }}</div>
    </li>
  </ul>
</template>
