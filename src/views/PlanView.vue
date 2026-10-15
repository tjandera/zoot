<script setup>
import { computed, onMounted } from 'vue'
import { useTripStore } from '../stores/trip.js'
import { useUserStore } from '../stores/user.js'
import { useUiStore } from '../stores/ui.js'
import { ORIGINS, INTERESTS, STYLES } from '../data/origins.js'
import { computeBudget } from '../lib/budget.js'
import { fmtDuration, fmtTime } from '../lib/hours.js'
import { now, tick } from '../lib/clock.js'
import BufferBar from '../components/BufferBar.vue'
import WeatherChip from '../components/WeatherChip.vue'

/** Clock form (Kayra). . */
const trip = useTripStore()
const user = useUserStore()
const ui = useUiStore()
const d = trip.draft

onMounted(() => { if (!ui.weather) ui.loadWeather() })

const budget = computed(() => {
  tick.value // re-evaluate as the clock moves
  return computeBudget({ origin: trip.origin, startMs: now(), mustReturnMs: trip.mustReturnMs, cleared: d.cleared })
})
const tooShort = computed(() => budget.value.usable_min < 60)
const style = computed(() => STYLES[user.profile?.style] || STYLES.budget)

function toggleInterest(id) {
  const i = d.interests.indexOf(id)
  i >= 0 ? d.interests.splice(i, 1) : d.interests.push(id)
}

function submit() {
  ui.toast('Itinerary builder is coming soon. Explore the 3D map for now.', 'dark', 4000)
}
</script>

<template>
  <main class="zt-page">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div>
        <h1 class="mb-0" style="font-size: 2.4rem">Plan a layover</h1>
        <p class="text-muted mb-0 small">Clock first, then the fun.</p>
      </div>
      <WeatherChip />
    </div>

    <form class="d-grid gap-3 mt-3" @submit.prevent="submit">
      <section class="zt-card p-3">
        <label class="form-label">Where are you starting?</label>
        <div class="origin-grid">
          <button v-for="o in ORIGINS" :key="o.id" type="button" class="origin" :class="{ active: d.originId === o.id }" @click="d.originId = o.id" :aria-pressed="d.originId === o.id">
            <i class="bi" :class="o.kind === 'airport' ? 'bi-airplane-engines' : 'bi-building'"></i>
            <span>{{ o.short }}</span>
          </button>
        </div>
        <div v-if="trip.origin.kind === 'airport'" class="form-check form-switch mt-3">
          <input id="cleared" v-model="d.cleared" class="form-check-input" type="checkbox" role="switch" />
          <label class="form-check-label small fw-bold" for="cleared">I’m already landside (skip the 30 min arrival buffer)</label>
        </div>
      </section>

      <section class="zt-card p-3">
        <div class="d-flex justify-content-between align-items-baseline">
          <label class="form-label mb-0" for="hours">Hours until you must be back</label>
          <span class="hours-num mono">{{ d.hours }} h</span>
        </div>
        <input id="hours" type="range" class="form-range" min="2" max="16" step="0.5" :value="d.hours" @input="trip.setHours(Number($event.target.value))" />
        <label class="form-label mt-2" for="ret">{{ trip.origin.kind === 'airport' ? 'Gate / boarding time' : 'Must be back at the hotel by' }} <span class="text-muted fw-normal">(Singapore time)</span></label>
        <input id="ret" v-model="d.mustReturnLocal" type="datetime-local" class="form-control" @change="trip.syncHoursFromReturn()" required />

        <div class="mt-3">
          <div class="d-flex justify-content-between small fw-bold mb-2">
            <span>Your window: {{ fmtDuration(budget.window_min) }}</span>
            <span :class="tooShort ? 'text-danger' : 'text-success'">{{ tooShort ? 'Too tight to leave' : `${fmtDuration(budget.usable_min)} to explore` }}</span>
          </div>
          <BufferBar :window-min="budget.window_min" :exit-min="budget.exit_min" :out-min="Math.max(0, budget.usable_min)" :reentry-min="budget.reentry_min" :safety-min="budget.safety_min" />
          <!-- <p class="tiny text-muted mt-2 mb-0">
            You must be back at {{ trip.origin.short }} by <b>{{ fmtTime(budget.arriveByMs) }}</b>.
            <template v-if="budget.airport">Airport buffer: {{ budget.reentry_min + budget.safety_min }} min (check-in, immigration and security {{ budget.reentry_min }} + safety {{ budget.safety_min }}).</template>
          </p> -->
        </div>
      </section>

      <section class="zt-card p-3">
        <label class="form-label">What are you into?</label>
        <div class="d-flex flex-wrap gap-2">
          <button v-for="i in INTERESTS" :key="i.id" type="button" class="zt-chip" :class="{ active: d.interests.includes(i.id) }" :aria-pressed="d.interests.includes(i.id)" @click="toggleInterest(i.id)">
            <i class="bi" :class="i.icon"></i>{{ i.label }}
          </button>
        </div>
      </section>

      <!-- <section class="zt-card p-3">
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="form-label">Energy</label>
            <div class="btn-group w-100" role="group" aria-label="Energy">
              <template v-for="e in ['low', 'med', 'high']" :key="e">
                <input :id="'en-' + e" v-model="d.energy" type="radio" class="btn-check" :value="e" />
                <label class="btn btn-soft text-capitalize" :for="'en-' + e">{{ e === 'med' ? 'Medium' : e }}</label>
              </template>
            </div>
          </div>
          <div class="col-sm-6">
            <label class="form-label" for="indoor">Indoors</label>
            <select id="indoor" v-model="d.indoorPref" class="form-select">
              <option value="any">No preference</option>
              <option value="prefer">Prefer air-con</option>
              <option value="only">Indoor only</option>
            </select>
          </div>
          <div class="col-sm-6">
            <label class="form-label" for="walk">Longest walk per leg: <span class="mono">{{ d.maxWalk }} min</span></label>
            <input id="walk" v-model.number="d.maxWalk" type="range" class="form-range" min="5" max="18" step="1" />
          </div>
          <div class="col-sm-6">
            <label class="form-label" for="party">Party size</label>
            <input id="party" v-model.number="d.partySize" type="number" min="1" max="8" class="form-control" />
          </div>
        </div>
        <p class="tiny text-muted mt-3 mb-0">
          Travel style: <span class="zt-pill"><i class="bi" :class="style.icon"></i> {{ style.label }}</span>
          <RouterLink to="/onboard" class="ms-1">change</RouterLink>
        </p>
      </section> -->

      <div v-if="tooShort" class="alert alert-warning mb-0">
        <i class="bi bi-exclamation-triangle"></i> With these buffers you’d have {{ Math.max(0, budget.usable_min) }} minutes outside. Zoot won’t plan a trip that risks your flight. Stay airside and explore the terminal.
      </div>

      <button class="btn btn-primary btn-lg" :disabled="tooShort || !d.interests.length">
        <i class="bi bi-magic"></i> Build my quest
      </button>
    </form>

  </main>
</template>

<style scoped>
.origin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.origin { border: var(--zt-bw) solid var(--zt-line); background: var(--zt-card); border-radius: 16px; padding: 12px 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; font-weight: 800; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.02em; color: var(--zt-ink); transition: transform 0.08s, box-shadow 0.08s; }
.origin i { font-size: 1.5rem; }
.origin.active { background: var(--zt-yellow); color: #111; box-shadow: 0 4px 0 var(--zt-shadow-color); transform: translateY(-3px); }
.hours-num { font-family: var(--zt-font-display); font-size: 2.4rem; line-height: 1; }
</style>
