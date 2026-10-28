<script setup lang="ts">
defineProps<{ color: string; emoji: string | null; large?: boolean }>()
</script>

<template>
  <div class="cover" :class="{ large }" :style="{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }" aria-hidden="true">
    {{ emoji || '' }}
  </div>
</template>
