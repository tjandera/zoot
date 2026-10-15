import { decodePolyline } from '../../src/lib/polyline.js'

/**
 * Minimal OneMap (Singapore Land Authority) routing client for Vercel functions.
 * Credentials stay on the server; the browser only ever calls /api/route.
 *
 * Token: ONEMAP_TOKEN while it is valid (OneMap tokens last ~3 days), otherwise
 * a fresh one from ONEMAP_EMAIL + ONEMAP_PASSWORD, cached until it expires.
 */
const BASE = 'https://www.onemap.gov.sg'
const MIN = 60000
let cached = null

function jwtExpMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return (payload.exp || 0) * 1000
  } catch {
    return 0
  }
}

export function onemapConfigured() {
  const { ONEMAP_TOKEN, ONEMAP_EMAIL, ONEMAP_PASSWORD } = process.env
  return Boolean(ONEMAP_TOKEN || (ONEMAP_EMAIL && ONEMAP_PASSWORD))
}

export async function onemapToken() {
  if (cached && cached.exp - Date.now() > 5 * MIN) return cached.token
  const { ONEMAP_TOKEN, ONEMAP_EMAIL, ONEMAP_PASSWORD } = process.env
  if (ONEMAP_TOKEN && jwtExpMs(ONEMAP_TOKEN) - Date.now() > 5 * MIN) {
    cached = { token: ONEMAP_TOKEN, exp: jwtExpMs(ONEMAP_TOKEN) }
    return cached.token
  }
  if (!ONEMAP_EMAIL || !ONEMAP_PASSWORD) {
    throw Object.assign(new Error('OneMap token expired. Set ONEMAP_EMAIL + ONEMAP_PASSWORD so the server can renew it.'), { status: 503 })
  }
  const res = await fetch(`${BASE}/api/auth/post/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ONEMAP_EMAIL, password: ONEMAP_PASSWORD })
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) throw Object.assign(new Error(`OneMap login failed (${res.status})`), { status: 502 })
  cached = { token: json.access_token, exp: jwtExpMs(json.access_token) || Date.now() + 60 * MIN }
  return cached.token
}

async function call(params, timeoutMs = 10000) {
  const url = new URL(`${BASE}/api/public/routingsvc/route`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: { Authorization: await onemapToken() }, signal: ctrl.signal })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(`OneMap ${res.status}: ${JSON.stringify(json).slice(0, 160)}`), { status: res.status })
    return json
  } finally {
    clearTimeout(timer)
  }
}

const ll = (p) => `${p.lat},${p.lng}`

/** Walk or drive: one polyline. Returns the raw encoded geometry too (the generator stores it as-is). */
export async function onemapStreetRoute(from, to, routeType = 'walk') {
  const j = await call({ start: ll(from), end: ll(to), routeType })
  if (!j.route_geometry || !j.route_summary) throw Object.assign(new Error('OneMap found no route'), { status: 404 })
  return {
    seconds: j.route_summary.total_time,
    meters: j.route_summary.total_distance,
    encoded: j.route_geometry,
    segments: [{ mode: routeType === 'drive' ? 'taxi' : 'walk', coordinates: decodePolyline(j.route_geometry) }]
  }
}

const TRANSIT_MODE = { WALK: 'walk', BUS: 'bus', SUBWAY: 'mrt', RAIL: 'mrt', TRAM: 'mrt' }

/** Public transport (MRT/LRT/bus) at a given time: one segment per itinerary leg. */
export async function onemapTransitRoute(from, to, atMs = Date.now()) {
  const sg = new Date(atMs + 8 * 3600e3) // OneMap expects Singapore wall-clock time
  const p2 = (n) => String(n).padStart(2, '0')
  const j = await call({
    start: ll(from), end: ll(to), routeType: 'pt', mode: 'TRANSIT', numItineraries: 1, maxWalkDistance: 1000,
    date: `${p2(sg.getUTCMonth() + 1)}-${p2(sg.getUTCDate())}-${sg.getUTCFullYear()}`,
    time: `${p2(sg.getUTCHours())}:${p2(sg.getUTCMinutes())}:00`
  })
  const it = j.plan?.itineraries?.[0]
  if (!it) throw Object.assign(new Error('OneMap found no transit route'), { status: 404 })
  return {
    seconds: it.duration,
    meters: Math.round(it.legs.reduce((s, l) => s + (l.distance || 0), 0)),
    segments: it.legs
      .filter((l) => l.legGeometry?.points)
      .map((l) => ({ mode: TRANSIT_MODE[l.mode] || 'mrt', line: l.route || null, coordinates: decodePolyline(l.legGeometry.points) }))
  }
}
