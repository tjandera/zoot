import { decodePolyline, coordKey, pairKey } from '../lib/polyline.js'
import { distanceM } from '../lib/travel.js'

/**
 * Street-following shapes for the quest path (OneMap). Lookups are synchronous so
 * routeGeoJSON can run every frame tick: a miss returns null (caller draws a straight
 * segment) and starts a fetch; the next tick picks the shape up.
 *   walk between fixed points → bundled walk-geometry.sg.json (npm run routes:gen), lazy-loaded
 *   anything else            → POST /api/route, cached in memory + localStorage
 * Segment = { mode: 'walk'|'mrt'|'bus'|'taxi', coordinates: [[lng, lat], ...] }
 */
const STORE = 'zoot.route.v1.'
const RETRY_MS = 5 * 60000
const LIVE_OFF_ROUTE_M = 60
const LIVE_MIN_GAP_MS = 8000

let bundled = null
let disabled = false // no /api/route here (preview build) or OneMap not configured
const shapes = new Map()
const pending = new Set()
const failedAt = new Map()
let live = null // { target, mode, segments, flat, fetchedAt }
let liveBusy = false

import('../data/walk-geometry.sg.json')
  .then((m) => { bundled = m.default })
  .catch(() => { bundled = {} })

function fromBundle(a, b) {
  if (!bundled) return null
  const { key, reversed } = pairKey(a, b)
  const encoded = bundled[key]
  if (!encoded) return null
  if (!shapes.has('w:' + key)) shapes.set('w:' + key, decodePolyline(encoded))
  const coords = shapes.get('w:' + key)
  return [{ mode: 'walk', coordinates: reversed ? [...coords].reverse() : coords }]
}

async function fetchRoute(from, to, mode, atMs) {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng }, mode, at_iso: new Date(atMs).toISOString() })
  })
  if (res.status === 503) disabled = true
  if (!res.ok) throw new Error(`route ${res.status}`)
  return (await res.json()).segments
}

/** Pin the drawn line to the stop markers: OneMap snaps its ends to the nearest road. */
function attach(segments, a, b) {
  if (!segments?.length) return null
  const out = segments.map((s) => ({ ...s, coordinates: s.coordinates }))
  out[0] = { ...out[0], coordinates: [[a.lng, a.lat], ...out[0].coordinates] }
  const last = out.length - 1
  out[last] = { ...out[last], coordinates: [...out[last].coordinates, [b.lng, b.lat]] }
  return out
}

/** Planned segment between two fixed points (stop → stop, last stop → home). */
export function legShape(a, b, mode, atMs) {
  if (mode === 'walk') {
    const hit = fromBundle(a, b)
    if (hit) return attach(hit, a, b)
  }
  const key = `${mode}:${coordKey(a)}>${coordKey(b)}`
  if (!shapes.has(key)) {
    try {
      const stored = localStorage.getItem(STORE + key)
      if (stored) shapes.set(key, JSON.parse(stored))
    } catch {}
  }
  if (shapes.has(key)) return attach(shapes.get(key), a, b)
  if (disabled || pending.has(key) || Date.now() - (failedAt.get(key) || 0) < RETRY_MS) return null
  pending.add(key)
  fetchRoute(a, b, mode, atMs)
    .then((segments) => {
      shapes.set(key, segments)
      try { localStorage.setItem(STORE + key, JSON.stringify(segments)) } catch {}
    })
    .catch(() => failedAt.set(key, Date.now()))
    .finally(() => pending.delete(key))
  return null
}

/**
 * Live segment from the traveller to the next stop. Fetched once, then trimmed to the
 * traveller's position as they walk; re-fetched only when they stray off the line.
 */
export function liveShape(here, target, mode, atMs) {
  const targetKey = coordKey(target)
  const same = live && live.target === targetKey && live.mode === mode
  let nearest = -1
  let offBy = Infinity
  if (same) {
    live.flat.forEach(([lng, lat], i) => {
      const d = distanceM(here, { lng, lat })
      if (d < offBy) { offBy = d; nearest = i }
    })
  }
  const stale = !same || offBy > LIVE_OFF_ROUTE_M
  if (stale && !disabled && !liveBusy && Date.now() - (live?.fetchedAt || 0) > LIVE_MIN_GAP_MS) {
    liveBusy = true
    const snapshot = { lat: here.lat, lng: here.lng }
    fetchRoute(snapshot, target, mode, atMs)
      .then((segments) => {
        live = { target: targetKey, mode, segments, flat: segments.flatMap((s) => s.coordinates), fetchedAt: Date.now() }
      })
      .catch(() => { live = { target: targetKey, mode, segments: null, flat: [], fetchedAt: Date.now() } })
      .finally(() => { liveBusy = false })
  }
  if (!same || !live.segments || offBy > LIVE_OFF_ROUTE_M) return null

  // Drop the part already walked: keep segments from the one holding the nearest vertex.
  let skip = nearest
  const out = []
  for (const s of live.segments) {
    if (skip >= s.coordinates.length) { skip -= s.coordinates.length; continue }
    out.push({ ...s, coordinates: skip > 0 ? s.coordinates.slice(skip) : s.coordinates })
    skip = 0
  }
  return attach(out.filter((s) => s.coordinates.length), here, target)
}
