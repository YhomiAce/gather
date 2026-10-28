<script setup lang="ts">
import type { RsvpResponseValue } from '~~/shared/types/api'

defineProps<{ question: string | null; showEmail?: boolean }>()
const name = defineModel<string>('name', { required: true })
const email = defineModel<string>('email', { default: '' })
const response = defineModel<RsvpResponseValue>('response', { required: true })
const answer = defineModel<string>('answer', { default: '' })
</script>

<template>
  <div class="stack">
    <div class="segmented" role="radiogroup" aria-label="Your response">
      <label><input v-model="response" type="radio" value="going" /> 👍 Going</label>
      <label><input v-model="response" type="radio" value="maybe" /> 🤔 Maybe</label>
      <label><input v-model="response" type="radio" value="not_going" /> 🙅 Can't go</label>
    </div>
    <div class="field">
      <label for="rsvp-name">Name</label>
      <input id="rsvp-name" v-model="name" required maxlength="80" autocomplete="name" />
    </div>
    <div v-if="showEmail" class="field">
      <label for="rsvp-email">Email</label>
      <input id="rsvp-email" v-model="email" type="email" required maxlength="200" autocomplete="email" />
    </div>
    <div v-if="question" class="field">
      <label for="rsvp-answer">{{ question }}</label>
      <input id="rsvp-answer" v-model="answer" maxlength="1000" />
    </div>
  </div>
</template>
