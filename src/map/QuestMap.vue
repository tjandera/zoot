<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './maplibreSetup.js'
import { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { questStyle } from './style.js'
import { WorldLayer } from '../gl/worldLayer.js'
import { geo, stepWalk, nudge, walkTo, hasFix } from '../lib/geo.js'
import { CITY } from '../lib/config.js'

/**
 * The 3D overworld (Matthew's lane). MapLibre draws the pastel city,
 * WorldLayer (Three.js) draws the traveller in the same GL context.
 * Demo build: explore mode only (no quest path or stops).
 */
const props = defineProps({
  dark: { type: Boolean, default: false }
})
const emit = defineEmits(['follow-change', 'fatal'])

const el = ref(null)
const flat = ref(false) // 2D fallback (pitch 0 + emoji avatar) when Three.js cannot start
let map = null
let world = null
let raf = 0
let lastT = 0
let display = null
let following = true
let emoji = null
const keys = new Set()

const FOLLOW = { zoom: 16.5, pitch: 56 }
const KEY_DIRS = { w: 0, arrowup: 0, s: 180, arrowdown: 180, a: -90, arrowleft: -90, d: 90, arrowright: 90 }

const startPoint = () => (hasFix() ? { lng: geo.lng, lat: geo.lat } : { lng: CITY.lng, lat: CITY.lat })

onMounted(() => {
  try {
    const start = startPoint()
    map = new MapLibreMap({
      container: el.value,
      style: questStyle({ dark: props.dark }),
      center: [start.lng, start.lat],
      zoom: FOLLOW.zoom,
      pitch: FOLLOW.pitch,
      bearing: -18,
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
  map.scrollZoom.enable({ around: 'center' })
  map.touchZoomRotate.enable({ around: 'center' })
  map.on('style.load', setupLayers)
  map.on('dragstart', () => setFollow(false))
  map.on('click', onClick)
  map.on('resize', applyPadding)
  map.on('webglcontextlost', () => emit('fatal', new Error('WebGL context lost')))
  applyPadding()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
  emoji?.remove()
  map?.remove()
  map = null
  world = null
})

/** Keep the traveller in the clear band between the top HUD and the bottom card. */
function applyPadding() {
  if (!map) return
  const h = map.getContainer().clientHeight
  map.setPadding({ top: Math.round(h * 0.06), bottom: Math.round(h * 0.25), left: 0, right: 0 })
}

function setupLayers() {
  try {
    if (flat.value) throw new Error('flat mode')
    world = new WorldLayer(startPoint(), { dark: props.dark })
    map.addLayer(world)
  } catch (err) {
    goFlat(err)
  }
}

function goFlat(err) {
  if (err?.message !== 'flat mode') console.warn('[map] 3D layer unavailable, using 2D fallback:', err)
  flat.value = true
  world = null
  map.setPitch(0)
  if (!emoji) {
    const node = document.createElement('div')
    node.className = 'emoji-avatar'
    node.textContent = '🧍'
    emoji = new Marker({ element: node })
  }
}

watch(() => props.dark, (dark) => {
  if (!map) return
  world = null
  map.setStyle(questStyle({ dark }))
})

function setFollow(on) {
  if (following === on) return
  following = on
  emit('follow-change', on)
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!map) return
  const dt = lastT ? Math.min(100, t - lastT) : 16
  lastT = t

  if (geo.fake) {
    stepWalk(dt)
    const dirs = [...keys].map((k) => KEY_DIRS[k]).filter((d) => d !== undefined)
    if (dirs.length && hasFix()) {
      const x = dirs.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0)
      const y = dirs.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0)
      const rel = (Math.atan2(x, y) * 180) / Math.PI
      const speed = (keys.has('shift') ? 4 : 1) * 3 * Math.max(1, geo.speed) // m/s
      nudge(speed * (dt / 1000), map.getBearing() + rel)
      geo.walkTarget = null
      setFollow(true)
    }
  }

  if (hasFix()) {
    if (!display) display = { lng: geo.lng, lat: geo.lat }
    const a = 1 - Math.exp(-dt / 300) // 300 ms follow lerp
    const prev = { ...display }
    display.lng += (geo.lng - display.lng) * a
    display.lat += (geo.lat - display.lat) * a
    const dx = (display.lng - prev.lng) * 111320 * Math.cos((display.lat * Math.PI) / 180)
    const dy = (display.lat - prev.lat) * 110540
    const speed = Math.hypot(dx, dy) / (dt / 1000)
    world?.setAvatar({ lng: display.lng, lat: display.lat, heading: geo.heading, moving: speed > 0.4 })
    if (flat.value && emoji) {
      emoji.setLngLat([display.lng, display.lat])
      if (!emoji._map) emoji.addTo(map)
    }
    if (following) map.jumpTo({ center: [display.lng, display.lat] })
  }
}

function onClick(e) {
  if (!geo.fake) return
  walkTo({ lng: e.lngLat.lng, lat: e.lngLat.lat })
  setFollow(true)
}

function onKey(e) {
  if (!geo.fake || e.target.closest?.('input, textarea, select')) return
  const k = e.key.toLowerCase()
  if (k in KEY_DIRS || k === 'shift') {
    keys.add(k)
    if (k.startsWith('arrow')) e.preventDefault()
  }
}
function onKeyUp(e) {
  keys.delete(e.key.toLowerCase())
}

defineExpose({
  recenter() {
    setFollow(true)
    map?.easeTo({ zoom: FOLLOW.zoom, pitch: flat.value ? 0 : FOLLOW.pitch, duration: 600 })
  },
  overview() {
    if (!map) return
    setFollow(false)
    map.easeTo({ zoom: 14, pitch: flat.value ? 0 : 50, bearing: map.getBearing() - 30, duration: 900 })
  }
})
</script>

<template>
  <div ref="el" class="quest-map" :class="{ flat }"></div>
</template>

<style scoped>
.quest-map { position: absolute; inset: 0; }
.quest-map :deep(.emoji-avatar) { font-size: 34px; filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.3)); }
.quest-map :deep(.maplibregl-ctrl-attrib) { font-size: 10px; }
.quest-map :deep(.maplibregl-ctrl-bottom-right) { bottom: calc(var(--zt-nav-h) + 16px); }
</style>
