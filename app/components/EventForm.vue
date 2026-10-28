<script setup lang="ts">
import type { LocationKind, Visibility } from '~~/shared/types/api'

/** Values edited by the form; mirrors the API's event input. */
export interface EventFormValues {
  title: string
  description: string
  startsLocal: string
  endsLocal: string
  timeZone: string
  locationKind: LocationKind
  location: string
  capacity: number | null
  coverColor: string
  coverEmoji: string
  visibility: Visibility
  question: string
  hostName: string
  hostEmail: string
  website: string
}

const props = defineProps<{ initial: EventFormValues; submitLabel: string; busy?: boolean; error?: string | null }>()
const emit = defineEmits<{ submit: [values: EventFormValues] }>()

const form = reactive<EventFormValues>({ ...props.initial })
const capacityInput = ref<string>(props.initial.capacity ? String(props.initial.capacity) : '')
const zones = ref<string[]>([props.initial.timeZone])
const emojis = ['🎉', '💻', '📚', '🎨', '🏃', '🍕', '🎤', '☕', '⚡', '🌍']

onMounted(() => {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  zones.value = Array.from(new Set(['UTC', ...all, form.timeZone])).sort()
})

function onSubmit(): void {
  const capacity = capacityInput.value.trim() ? Number(capacityInput.value) : null
  emit('submit', { ...form, capacity })
}
</script>

<template>
  <form class="card stack" @submit.prevent="onSubmit">
    <div class="field">
      <label for="title">Event name</label>
      <input id="title" v-model="form.title" required maxlength="120" placeholder="Friday frontend meetup" />
    </div>

    <div class="field">
      <label for="description">Description <span class="hint">Markdown supported</span></label>
      <textarea id="description" v-model="form.description" maxlength="10000" placeholder="What's happening, who it's for, what to bring…" />
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="starts">Starts</label>
        <input id="starts" v-model="form.startsLocal" type="datetime-local" required />
      </div>
      <div class="field">
        <label for="ends">Ends</label>
        <input id="ends" v-model="form.endsLocal" type="datetime-local" required />
      </div>
    </div>

    <div class="field">
      <label for="tz">Time zone <span class="hint">Guests see times in this zone</span></label>
      <select id="tz" v-model="form.timeZone" required>
        <option v-for="z in zones" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option>
      </select>
    </div>

    <fieldset class="field" style="border: 0; padding: 0; margin: 0">
      <legend><label>Where</label></legend>
      <div class="segmented">
        <label><input v-model="form.locationKind" type="radio" value="venue" /> 📍 Venue</label>
        <label><input v-model="form.locationKind" type="radio" value="online" /> 💻 Online</label>
      </div>
      <input
        v-model="form.location"
        :type="form.locationKind === 'online' ? 'url' : 'text'"
        :placeholder="form.locationKind === 'online' ? 'https://meet.example.com/your-room' : 'Venue name and address'"
        aria-label="Location"
        required
        maxlength="300"
        style="margin-top: .5rem"
      />
      <span v-if="form.locationKind === 'online'" class="hint">The link is only shown to guests after they RSVP.</span>
    </fieldset>

    <div class="grid-2">
      <div class="field">
        <label for="capacity">Capacity <span class="hint">Leave empty for unlimited</span></label>
        <input id="capacity" v-model="capacityInput" type="number" min="1" max="100000" inputmode="numeric" placeholder="Unlimited" />
      </div>
      <div class="field">
        <label for="visibility">Visibility</label>
        <select id="visibility" v-model="form.visibility">
          <option value="public">Public: listed on the home page</option>
          <option value="unlisted">Unlisted: only people with the link</option>
        </select>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="color">Cover colour</label>
        <input id="color" v-model="form.coverColor" type="color" />
      </div>
      <div class="field">
        <label for="emoji">Cover emoji <span class="hint">Optional</span></label>
        <input id="emoji" v-model="form.coverEmoji" maxlength="16" list="emoji-list" placeholder="🎉" />
        <datalist id="emoji-list"><option v-for="e in emojis" :key="e" :value="e" /></datalist>
      </div>
    </div>
    <EventCover :color="form.coverColor" :emoji="form.coverEmoji || null" />

    <div class="field">
      <label for="question">Question for guests <span class="hint">Optional, e.g. "Any dietary needs?"</span></label>
      <input id="question" v-model="form.question" maxlength="200" />
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="host">Your name</label>
        <input id="host" v-model="form.hostName" required maxlength="80" />
      </div>
      <div class="field">
        <label for="hostEmail">Your email <span class="hint">Optional, not shown publicly</span></label>
        <input id="hostEmail" v-model="form.hostEmail" type="email" maxlength="200" />
      </div>
    </div>

    <div class="hp" aria-hidden="true">
      <label for="website">Leave this empty</label>
      <input id="website" v-model="form.website" tabindex="-1" autocomplete="off" />
    </div>

    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <button class="btn" type="submit" :disabled="busy">{{ busy ? 'Saving…' : submitLabel }}</button>
  </form>
</template>
