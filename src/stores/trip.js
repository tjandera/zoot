import { defineStore } from 'pinia'
import { ORIGINS } from '../data/origins.js'
import { now } from '../lib/clock.js'
import { toSgLocalInput, fromSgLocalInput } from '../lib/hours.js'

/** Planner form draft (Kayra). The itinerary engine is not part of this demo build. */
export const useTripStore = defineStore('trip', {
  state: () => ({
    draft: defaultDraft()
  }),
  getters: {
    origin: (s) => ORIGINS.find((o) => o.id === s.draft.originId) || ORIGINS[0],
    startMs: () => now(),
    mustReturnMs: (s) => fromSgLocalInput(s.draft.mustReturnLocal)
  },
  actions: {
    setHours(h) {
      this.draft.hours = h
      this.draft.mustReturnLocal = toSgLocalInput(roundTo5(now() + h * 3600e3))
    },
    syncHoursFromReturn() {
      this.draft.hours = Math.max(1, Math.round(((this.mustReturnMs - now()) / 3600e3) * 2) / 2)
    }
  }
})

function roundTo5(ms) {
  return Math.ceil(ms / 300000) * 300000
}

function defaultDraft() {
  return {
    originId: 'changi-t3',
    hours: 8,
    mustReturnLocal: toSgLocalInput(roundTo5(now() + 8 * 3600e3)),
    interests: ['hawker', 'gardens', 'photo'],
    energy: 'med',
    indoorPref: 'any',
    maxWalk: 18,
    partySize: 1,
    cleared: false
  }
}
