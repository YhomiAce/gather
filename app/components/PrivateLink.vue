<script setup lang="ts">
defineProps<{ url: string; label: string }>()
</script>

<template>
  <div class="field">
    <label>{{ label }}</label>
    <div class="link-box">
      <input :value="url" readonly aria-readonly="true" @focus="($event.target as HTMLInputElement).select()" />
      <CopyButton :text="url" />
    </div>
  </div>
</template>
