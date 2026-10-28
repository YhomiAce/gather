<script setup lang="ts">
const props = defineProps<{ text: string; label?: string }>()
const copied = ref(false)

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    window.prompt('Copy this:', props.text)
  }
}
</script>

<template>
  <button type="button" class="btn secondary small" @click="copy">{{ copied ? 'Copied!' : label || 'Copy' }}</button>
</template>
