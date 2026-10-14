import { CITY } from './config.js'

/** Singapore time helpers: fixed +08:00 offset (no DST in SG). */
export function sgParts(ms) {
  const d = new Date(ms + CITY.utcOffsetMin * 60000)
  return { minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), day: d.getUTCDay(), hour: d.getUTCHours() }
}

/** "14:05" in Singapore time. */
export function fmtTime(msOrIso) {
  const ms = typeof msOrIso === 'string' ? Date.parse(msOrIso) : msOrIso
  const { minutes } = sgParts(ms)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function fmtDuration(min) {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

/** "2026-09-24T18:30" (SG wall clock) for <input type="datetime-local">. */
export function toSgLocalInput(ms) {
  const d = new Date(ms + CITY.utcOffsetMin * 60000)
  return d.toISOString().slice(0, 16)
}

export function fromSgLocalInput(value) {
  return Date.parse(value + ':00Z') - CITY.utcOffsetMin * 60000
}
