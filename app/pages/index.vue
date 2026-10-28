<script setup lang="ts">
const { data: events, error } = await useFetch('/api/events', { key: 'upcoming-events' })
const siteUrl = useSiteUrl()

useSeoMeta({
  title: 'gather · upcoming events',
  description: 'Find upcoming meetups and RSVP in seconds, or create your own event page.',
  ogTitle: 'gather · upcoming events',
  ogDescription: 'Find upcoming meetups and RSVP in seconds, or create your own event page.',
  ogType: 'website',
  ogUrl: siteUrl,
  twitterCard: 'summary',
})
</script>

<template>
  <div class="container">
    <section class="hero">
      <div>
        <h1>Upcoming events</h1>
        <p class="muted" style="margin: 0">Meetups, clubs and get-togethers. RSVP in seconds, no account needed.</p>
      </div>
      <NuxtLink to="/new" class="btn">+ Create an event</NuxtLink>
    </section>

    <p v-if="error" class="alert error">Couldn't load events right now. Please refresh in a moment.</p>
    <div v-else-if="events && events.length" class="event-grid">
      <EventCard v-for="e in events" :key="e.slug" :event="e" />
    </div>
    <div v-else class="card empty">
      <h2>No upcoming events yet</h2>
      <p>Be the first to put something on the calendar.</p>
      <NuxtLink to="/new" class="btn">Create an event</NuxtLink>
    </div>
  </div>
</template>
