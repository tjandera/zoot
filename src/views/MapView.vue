<script setup>
import { onMounted, ref } from 'vue'
import QuestMap from '../map/QuestMap.vue'
import WeatherChip from '../components/WeatherChip.vue'
import { useUiStore } from '../stores/ui.js'
import { geo, setFake, teleport } from '../lib/geo.js'

/**
 * Demo build: the 3D toy city in explore mode. The traveller starts at Marina Bay on
 * fake GPS so the demo never depends on the laptop's location. WASD / arrows / tap to walk.
 */
const DEMO_START = { lat: 1.2868, lng: 103.8545 } // Marina Bay waterfront

const ui = useUiStore()
const mapRef = ref(null)
const following = ref(true)
const fatal = ref(null)
const speeds = [1, 6, 20]

// Before QuestMap mounts, so the camera opens on the traveller.
setFake(true)
teleport(DEMO_START)

onMounted(() => {
  if (!ui.weather) ui.loadWeather(DEMO_START.lat, DEMO_START.lng)
})

function backToStart() {
  teleport(DEMO_START)
  mapRef.value?.recenter()
}
</script>

<template>
  <main class="map-page">
    <QuestMap
      v-if="!fatal"
      ref="mapRef"
      :dark="ui.theme === 'dark'"
      @follow-change="following = $event"
      @fatal="fatal = $event"
    />
    <div v-else class="fatal p-4 text-center">
      <i class="bi bi-map display-4 text-muted"></i>
      <h1 class="h5 mt-2">This device can’t draw the 3D map</h1>
      <p class="text-muted small">{{ fatal.message }}.</p>
    </div>

    <!-- Top HUD -->
    <div class="hud-top">
      <div class="d-flex flex-column gap-2 align-items-start">
        <div class="city zt-glass"><img src="/brand/zoot-badge-192.png" alt="" /> Singapore</div>
        <WeatherChip />
      </div>
    </div>

    <!-- Right rail -->
    <div class="rail">
      <button class="rail-btn zt-glass" :class="{ active: following }" @click="mapRef?.recenter()" aria-label="Follow traveller"><i class="bi bi-crosshair"></i></button>
      <button class="rail-btn zt-glass" @click="mapRef?.overview()" aria-label="Zoom out over the city"><i class="bi bi-arrows-fullscreen"></i></button>
      <button class="rail-btn zt-glass" @click="backToStart" aria-label="Back to Marina Bay"><i class="bi bi-house-door"></i></button>
    </div>

    <!-- Bottom card -->
    <div class="bottom-stack">
      <div class="next-card zt-glass">
        <div class="tiny fw-800 text-muted text-uppercase">Explore mode</div>
        <div class="next-title">Singapore</div>
        <div class="dev-strip tiny mt-2">
          <!-- <span><i class="bi bi-keyboard"></i> WASD / arrows · tap the map to walk</span> -->
          <span class="ms-auto">Speed</span>
          <button v-for="s in speeds" :key="s" class="zt-chip py-0 px-2" :class="{ active: geo.speed === s }" @click="geo.speed = s">{{ s }}×</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.map-page { position: fixed; inset: 0; overflow: hidden; background: #fff4c2; }
[data-bs-theme='dark'] .map-page { background: #111; }
.fatal { position: absolute; inset: 0; display: grid; place-content: center; }
.hud-top { position: absolute; top: max(12px, env(safe-area-inset-top)); left: 12px; right: 14px; display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none; z-index: 10; }
.hud-top > * { pointer-events: auto; }
.city { font-family: var(--zt-font-head); font-weight: 700; font-size: 0.86rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 4px 12px; border-radius: 999px; box-shadow: var(--zt-shadow-sm); display: inline-flex; align-items: center; gap: 6px; }
.city img { width: 20px; height: 20px; }
.rail { position: absolute; right: 14px; top: 150px; display: flex; flex-direction: column; gap: 10px; z-index: 10; }
.rail-btn { width: 46px; height: 46px; border-radius: 14px; font-size: 1.15rem; color: var(--zt-ink); box-shadow: var(--zt-shadow-sm); display: grid; place-items: center; }
.rail-btn.active { color: #111; background: var(--zt-yellow); }
.rail-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--zt-shadow-color); }
.bottom-stack { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(var(--zt-nav-h) + 26px); width: min(520px, calc(100% - 24px)); z-index: 10; }
.next-card { width: 100%; border-radius: 22px; padding: 12px 14px; box-shadow: var(--zt-shadow); }
.next-title { font-family: var(--zt-font-display); font-size: 1.75rem; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; margin: 2px 0; }
.dev-strip { display: flex; align-items: center; gap: 6px; border-top: 2px dashed var(--zt-soft-line); padding-top: 8px; color: var(--zt-muted); }
.dev-strip .zt-chip { font-size: 0.7rem; border-width: 2px; }
</style>
