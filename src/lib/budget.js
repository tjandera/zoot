/**
 * Layover time budget (Kayra). The clock is the product: everything the traveller
 * does outside must end by arrive_by = must_return − re-entry − safety.
 * Drives the buffer bar on /plan. The itinerary engine itself is not in this demo build.
 */
const MIN = 60000

/** Buffers shown in the UI so Sonion can see why the plan is shorter than his layover. */
export function computeBudget({ origin, startMs, mustReturnMs, cleared = false }) {
  const airport = origin.kind === 'airport'
  const exit_min = airport && !cleared ? 30 : 0 // arrival immigration + bags to landside
  const reentry_min = airport ? 45 : 0 // check-in, departure immigration, security, walk to gate
  const safety_min = airport ? 45 : 20
  const window_min = Math.round((mustReturnMs - startMs) / MIN)
  const departMs = startMs + exit_min * MIN
  const arriveByMs = mustReturnMs - (reentry_min + safety_min) * MIN
  const usable_min = Math.round((arriveByMs - departMs) / MIN)
  return { airport, exit_min, reentry_min, safety_min, window_min, usable_min, departMs, arriveByMs, mustReturnMs }
}
