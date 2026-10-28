<script setup lang="ts">
import type { EventSummary } from '~~/shared/types/api'

const props = defineProps<{ event: EventSummary }>()
const start = computed(() => new Date(props.event.startsAt))
const badge = computed(() => calendarBadge(start.value, props.event.timeZone))
const when = computed(() => formatEventRange(start.value, new Date(props.event.endsAt), props.event.timeZone))
const full = computed(() => props.event.capacity !== null && props.event.counts.going >= props.event.capacity)
</script>

<template>
  <NuxtLink :to="`/e/${event.slug}`" class="card event-card">
    <EventCover :color="event.coverColor" :emoji="event.coverEmoji" />
    <div class="body">
      <div class="row" style="align-items: start; flex-wrap: nowrap">
        <div class="date-badge"><span class="m">{{ badge.month }}</span><span class="d">{{ badge.day }}</span></div>
        <div>
          <h3>{{ event.title }}</h3>
          <div class="muted small">{{ when }}</div>
          <div class="muted small">{{ event.locationLabel }}</div>
        </div>
      </div>
      <div class="row small" style="margin-top: .75rem">
        <span class="pill ok">{{ event.counts.going }} going</span>
        <span v-if="full" class="pill warn">Full · waitlist open</span>
        <span v-else-if="event.capacity" class="pill grey">{{ event.capacity - event.counts.going }} spots left</span>
      </div>
    </div>
  </NuxtLink>
</template>
