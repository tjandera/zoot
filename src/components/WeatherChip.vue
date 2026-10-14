<script setup>
import { computed } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { describeCode } from '../lib/weather.js'
import { tick } from '../lib/clock.js'

const ui = useUiStore()
const hour = computed(() => ui.weather?.hours?.find((h) => tick.value >= h.ms && tick.value < h.ms + 3600000))
const info = computed(() => {
  if (!ui.weather) return null
  const d = describeCode(ui.weather.current.code)
  return { ...d, prob: hour.value?.prob ?? 0, temp: Math.round(ui.weather.current.temp) }
})
const wet = computed(() => info.value && info.value.prob > 60)
</script>

<template>
  <div v-if="info" class="wx" :class="{ wet }" :title="`${info.label}, ${info.prob}% rain chance this hour`">
    <i class="bi" :class="info.icon"></i>
    <span v-if="info.temp != null" class="mono">{{ info.temp }}°</span>
    <span class="prob mono"><i class="bi bi-droplet-fill"></i>{{ info.prob }}%</span>
  </div>
</template>

<style scoped>
.wx { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; background: var(--zt-card); color: var(--zt-ink); border: var(--zt-bw) solid var(--zt-line); font-weight: 800; font-size: 0.8rem; box-shadow: var(--zt-shadow-sm); }
.wx .bi:first-child { font-size: 1rem; }
.wx.wet { background: #111; color: var(--zt-yellow); border-color: #111; box-shadow: 3px 3px 0 var(--zt-yellow); }
[data-bs-theme='dark'] .wx.wet { border-color: var(--zt-yellow); }
.prob { font-size: 0.74rem; display: inline-flex; align-items: center; gap: 2px; }
</style>
