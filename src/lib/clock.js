import { ref } from 'vue'

/** App clock. Time-sensitive UI (plan form, weather chip) reads now() and tick. */
export const tick = ref(Date.now())

export function now() {
  return Date.now()
}

// A 1 s heartbeat that components can depend on for countdowns.
setInterval(() => { tick.value = now() }, 1000)
