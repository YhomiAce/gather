<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const title = computed(() => (props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong'))
useHead({ title: () => `${title.value} · gather` })
</script>

<template>
  <div>
    <header class="site-header">
      <div class="container"><NuxtLink to="/" class="brand"><img src="/favicon.svg" alt="" /> gather</NuxtLink></div>
    </header>
    <main class="container narrow">
      <div class="card empty">
        <p class="pill grey">{{ error.statusCode }}</p>
        <h1>{{ title }}</h1>
        <p>{{ error.statusCode === 404 ? "That link doesn't point to anything here." : error.statusMessage || 'Please try again in a moment.' }}</p>
        <button class="btn" @click="clearError({ redirect: '/' })">Back to events</button>
      </div>
    </main>
  </div>
</template>
