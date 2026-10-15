<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './maplibreSetup.js'
import { Map as MapLibreMap } from 'maplibre-gl'
import { questStyle } from './style.js'

/**
 * The 3D toy-city map (Matthew's lane). MapLibre draws the pastel city with extruded
 * buildings. Demo build: explore only (drag to pan, scroll to zoom, right-drag to tilt/rotate).
 */
const props = defineProps({
  center: { type: Object, required: true }, // { lat, lng }
  dark: { type: Boolean, default: false }
})
const emit = defineEmits(['fatal'])

const el = ref(null)
let map = null

const VIEW = { zoom: 16, pitch: 56, bearing: -18 }

onMounted(() => {
  try {
    map = new MapLibreMap({
      container: el.value,
      style: questStyle({ dark: props.dark }),
      center: [props.center.lng, props.center.lat],
      ...VIEW,
      maxPitch: 72,
      minZoom: 10,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    })
  } catch (err) {
    emit('fatal', err)
    return
  }
  map.on('webglcontextlost', () => emit('fatal', new Error('WebGL context lost')))
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

watch(() => props.dark, (dark) => map?.setStyle(questStyle({ dark })))

defineExpose({
  /** Back to the starting street-level 3D view. */
  reset() {
    map?.flyTo({ center: [props.center.lng, props.center.lat], ...VIEW, duration: 1000 })
  },
  /** Pull back over the city. */
  overview() {
    map?.easeTo({ zoom: 13.5, pitch: 50, bearing: map.getBearing() - 30, duration: 900 })
  },
  /** Slow quarter-turn around the current view, nice for showing the 3D buildings. */
  orbit() {
    map?.easeTo({ bearing: map.getBearing() + 90, duration: 4000, easing: (t) => t })
  }
})
</script>

<template>
  <div ref="el" class="quest-map"></div>
</template>

<style scoped>
.quest-map { position: absolute; inset: 0; }
.quest-map :deep(.maplibregl-ctrl-attrib) { font-size: 10px; }
.quest-map :deep(.maplibregl-ctrl-bottom-right) { bottom: calc(var(--zt-nav-h) + 16px); }
</style>
