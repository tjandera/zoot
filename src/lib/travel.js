import distance from '@turf/distance'
import { point } from '@turf/helpers'
import { pairKey } from './polyline.js'

/**
 * Travel-time model. Groq never produces minutes; this file does.
 *   walk  = OneMap street-network walk time when the pair is in the walk matrix
 *           (npm run routes:gen), else Turf great-circle distance × 1.3 detour ÷ 80 m/min
 *   mrt   = walk to nearest hub + 4 min wait + graph ride (+4 min per line change) + walk from hub
 *   taxi  = distance × 1.35 ÷ 28 km/h + 6 min pickup (only when no MRT hub is walkable)
 * The MRT graph is a small static slice of the real network, enough for
 * Changi ↔ City Hall ↔ Chinatown ↔ HarbourFront ↔ Gardens by the Bay.
 */

export const WALK_M_PER_MIN = 80
const DETOUR = 1.3
const MRT_WAIT_MIN = 4
const TRANSFER_MIN = 4
const MAX_HUB_WALK_MIN = 15
export const MRT_THRESHOLD_MIN = 18
// Trains run roughly 05:30–23:30 SGT (last trains vary by line); outside that we plan a taxi.
const MRT_OPEN_MIN = 5 * 60 + 30
const MRT_CLOSE_MIN = 23 * 60 + 30

export function mrtRunning(ms) {
  if (ms == null) return true
  const d = new Date(ms + 8 * 3600e3)
  const m = d.getUTCHours() * 60 + d.getUTCMinutes()
  return m >= MRT_OPEN_MIN && m < MRT_CLOSE_MIN
}

export const HUBS = {
  changi_airport: { name: 'Changi Airport', code: 'CG2', lat: 1.3574, lng: 103.9884 },
  tanah_merah: { name: 'Tanah Merah', code: 'EW4', lat: 1.3272, lng: 103.9465 },
  eunos: { name: 'Eunos', code: 'EW7', lat: 1.3197, lng: 103.9030 },
  paya_lebar: { name: 'Paya Lebar', code: 'EW8/CC9', lat: 1.3177, lng: 103.8927 },
  dakota: { name: 'Dakota', code: 'CC8', lat: 1.3083, lng: 103.8884 },
  stadium: { name: 'Stadium', code: 'CC6', lat: 1.3029, lng: 103.8753 },
  lavender: { name: 'Lavender', code: 'EW11', lat: 1.3073, lng: 103.8631 },
  bugis: { name: 'Bugis', code: 'EW12/DT14', lat: 1.3008, lng: 103.8559 },
  city_hall: { name: 'City Hall', code: 'EW13/NS25', lat: 1.2932, lng: 103.8520 },
  raffles_place: { name: 'Raffles Place', code: 'EW14/NS26', lat: 1.2839, lng: 103.8514 },
  tanjong_pagar: { name: 'Tanjong Pagar', code: 'EW15', lat: 1.2764, lng: 103.8455 },
  outram_park: { name: 'Outram Park', code: 'EW16/NE3/TE17', lat: 1.2803, lng: 103.8395 },
  tiong_bahru: { name: 'Tiong Bahru', code: 'EW17', lat: 1.2861, lng: 103.8270 },
  marina_bay: { name: 'Marina Bay', code: 'NS27/CE2/TE20', lat: 1.2764, lng: 103.8546 },
  bayfront: { name: 'Bayfront', code: 'CE1/DT16', lat: 1.2818, lng: 103.8590 },
  promenade: { name: 'Promenade', code: 'CC4/DT15', lat: 1.2934, lng: 103.8610 },
  esplanade: { name: 'Esplanade', code: 'CC3', lat: 1.2934, lng: 103.8554 },
  bras_basah: { name: 'Bras Basah', code: 'CC2', lat: 1.2969, lng: 103.8506 },
  gardens_by_the_bay: { name: 'Gardens by the Bay', code: 'TE22', lat: 1.2789, lng: 103.8687 },
  marine_parade: { name: 'Marine Parade', code: 'TE26', lat: 1.3027, lng: 103.9055 },
  maxwell: { name: 'Maxwell', code: 'TE18', lat: 1.2805, lng: 103.8437 },
  chinatown: { name: 'Chinatown', code: 'NE4/DT19', lat: 1.2844, lng: 103.8441 },
  clarke_quay: { name: 'Clarke Quay', code: 'NE5', lat: 1.2887, lng: 103.8466 },
  dhoby_ghaut: { name: 'Dhoby Ghaut', code: 'NS24/NE6/CC1', lat: 1.2990, lng: 103.8455 },
  little_india: { name: 'Little India', code: 'NE7/DT12', lat: 1.3066, lng: 103.8494 },
  farrer_park: { name: 'Farrer Park', code: 'NE8', lat: 1.3124, lng: 103.8543 },
  orchard: { name: 'Orchard', code: 'NS22/TE14', lat: 1.3040, lng: 103.8320 },
  newton: { name: 'Newton', code: 'NS21/DT11', lat: 1.3128, lng: 103.8381 },
  napier: { name: 'Napier', code: 'TE12', lat: 1.3067, lng: 103.8189 },
  botanic_gardens: { name: 'Botanic Gardens', code: 'CC19/DT9', lat: 1.3224, lng: 103.8154 },
  holland_village: { name: 'Holland Village', code: 'CC21', lat: 1.3113, lng: 103.7960 },
  haw_par_villa: { name: 'Haw Par Villa', code: 'CC25', lat: 1.2826, lng: 103.7822 },
  harbourfront: { name: 'HarbourFront', code: 'NE1/CC29', lat: 1.2653, lng: 103.8221 },
  rws: { name: 'Resorts World (Sentosa Express)', code: 'SE2', lat: 1.2557, lng: 103.8210 },
  beach: { name: 'Beach (Sentosa Express)', code: 'SE3', lat: 1.2535, lng: 103.8174 }
}

// [from, to, ride minutes, line]
const EDGES = [
  ['changi_airport', 'tanah_merah', 5, 'CG'],
  ['tanah_merah', 'eunos', 6, 'EW'], ['eunos', 'paya_lebar', 2, 'EW'], ['paya_lebar', 'lavender', 6, 'EW'],
  ['lavender', 'bugis', 2, 'EW'], ['bugis', 'city_hall', 2, 'EW'], ['city_hall', 'raffles_place', 2, 'EW'],
  ['raffles_place', 'tanjong_pagar', 2, 'EW'], ['tanjong_pagar', 'outram_park', 2, 'EW'], ['outram_park', 'tiong_bahru', 2, 'EW'],
  ['city_hall', 'dhoby_ghaut', 2, 'NS'], ['dhoby_ghaut', 'orchard', 4, 'NS'], ['orchard', 'newton', 2, 'NS'], ['raffles_place', 'marina_bay', 2, 'NS'],
  ['harbourfront', 'outram_park', 4, 'NE'], ['outram_park', 'chinatown', 2, 'NE'], ['chinatown', 'clarke_quay', 2, 'NE'],
  ['clarke_quay', 'dhoby_ghaut', 2, 'NE'], ['dhoby_ghaut', 'little_india', 2, 'NE'], ['little_india', 'farrer_park', 2, 'NE'],
  ['dhoby_ghaut', 'bras_basah', 2, 'CC'], ['bras_basah', 'esplanade', 2, 'CC'], ['esplanade', 'promenade', 2, 'CC'],
  ['promenade', 'stadium', 4, 'CC'], ['stadium', 'dakota', 4, 'CC'], ['dakota', 'paya_lebar', 2, 'CC'],
  ['promenade', 'bayfront', 2, 'CE'], ['bayfront', 'marina_bay', 2, 'CE'],
  ['botanic_gardens', 'holland_village', 4, 'CC'], ['holland_village', 'haw_par_villa', 8, 'CC'], ['haw_par_villa', 'harbourfront', 7, 'CC'],
  ['botanic_gardens', 'newton', 4, 'DT'], ['newton', 'little_india', 2, 'DT'], ['little_india', 'bugis', 4, 'DT'],
  ['bugis', 'promenade', 3, 'DT'], ['promenade', 'bayfront', 2, 'DT'], ['bayfront', 'chinatown', 5, 'DT'],
  ['napier', 'orchard', 4, 'TE'], ['orchard', 'outram_park', 6, 'TE'], ['outram_park', 'maxwell', 2, 'TE'],
  ['maxwell', 'marina_bay', 4, 'TE'], ['marina_bay', 'gardens_by_the_bay', 4, 'TE'], ['gardens_by_the_bay', 'marine_parade', 8, 'TE'],
  ['harbourfront', 'rws', 5, 'SE'], ['rws', 'beach', 3, 'SE']
]

const ADJ = {}
for (const [a, b, t, line] of EDGES) {
  ;(ADJ[a] ||= []).push({ to: b, t, line })
  ;(ADJ[b] ||= []).push({ to: a, t, line })
}

const rideCache = new Map()

/** Shortest ride between hubs with a transfer penalty. Dijkstra over (hub, line) states. */
export function rideMinutes(fromHub, toHub) {
  if (fromHub === toHub) return { minutes: 0, lines: [] }
  const key = fromHub + '>' + toHub
  if (rideCache.has(key)) return rideCache.get(key)
  const best = new Map()
  const queue = [{ node: fromHub, line: null, cost: 0, lines: [] }]
  let result = null
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const cur = queue.shift()
    const stateKey = cur.node + '|' + cur.line
    if (best.has(stateKey) && best.get(stateKey) <= cur.cost) continue
    best.set(stateKey, cur.cost)
    if (cur.node === toHub) { result = { minutes: cur.cost, lines: cur.lines }; break }
    for (const e of ADJ[cur.node] || []) {
      const change = cur.line && cur.line !== e.line ? TRANSFER_MIN : 0
      const lines = cur.line === e.line ? cur.lines : [...cur.lines, e.line]
      queue.push({ node: e.to, line: e.line, cost: cur.cost + e.t + change, lines })
    }
  }
  rideCache.set(key, result)
  return result
}

const pt = (p) => point([p.lng, p.lat])

export function distanceM(a, b) {
  return distance(pt(a), pt(b), { units: 'kilometers' }) * 1000
}

// { "lat,lng|lat,lng": [metres, seconds] } from OneMap. Registered by catalog.js (and the
// test script) so this file stays importable from plain Node without JSON imports.
let walkMatrix = {}
export function setWalkMatrix(m) {
  walkMatrix = m || {}
}

/** Real walking route between two points if we have it: { metres, seconds } or null. */
export function walkRoute(a, b) {
  const hit = walkMatrix[pairKey(a, b).key]
  return hit ? { metres: hit[0], seconds: hit[1] } : null
}

export function walkMinutes(a, b) {
  const real = walkRoute(a, b)
  if (real) return Math.max(1, Math.round(real.seconds / 60))
  return Math.max(1, Math.round((distanceM(a, b) * DETOUR) / WALK_M_PER_MIN))
}

export function nearestHub(p) {
  let best = null
  for (const [id, h] of Object.entries(HUBS)) {
    const d = distanceM(p, h)
    if (!best || d < best.d) best = { id, d, hub: h }
  }
  return { id: best.id, ...best.hub, walk_min: Math.max(1, Math.round((best.d * DETOUR) / WALK_M_PER_MIN)) }
}

function transit(a, b) {
  const ha = nearestHub(a)
  const hb = nearestHub(b)
  if (ha.id === hb.id) return null
  if (ha.walk_min > MAX_HUB_WALK_MIN || hb.walk_min > MAX_HUB_WALK_MIN) return null
  const ride = rideMinutes(ha.id, hb.id)
  if (!ride) return null
  return {
    minutes: ha.walk_min + MRT_WAIT_MIN + ride.minutes + hb.walk_min,
    from: ha.name,
    to: hb.name,
    lines: ride.lines
  }
}

function taxiMinutes(a, b) {
  return Math.round(((distanceM(a, b) * 1.35) / 1000 / 28) * 60 + 6)
}

/**
 * Pick a travel mode between two {lat,lng} points.
 * @param {{maxWalk?: number, style?: string, atMs?: number}} opts  atMs = departure time (MRT closes at night)
 * @returns {{mode:'walk'|'mrt'|'taxi', minutes:number, walk_min:number, distance_m:number, detail:string}}
 */
export function travel(a, b, opts = {}) {
  const maxWalk = Math.min(opts.maxWalk ?? MRT_THRESHOLD_MIN, MRT_THRESHOLD_MIN)
  const walk = walkMinutes(a, b)
  const distance_m = Math.round(distanceM(a, b))
  const street_m = walkRoute(a, b)?.metres
  const onFoot = { mode: 'walk', minutes: walk, walk_min: walk, distance_m, detail: `${street_m ?? distance_m} m on foot` }
  if (walk <= maxWalk) return onFoot

  const t = mrtRunning(opts.atMs) ? transit(a, b) : null
  const taxi = taxiMinutes(a, b)
  const byMrt = t && { mode: 'mrt', minutes: t.minutes, walk_min: walk, distance_m, detail: `MRT ${t.from} → ${t.to} (${t.lines.join('→')})` }
  const byTaxi = (why) => ({ mode: 'taxi', minutes: taxi, walk_min: walk, distance_m, detail: `Taxi / Grab · ${why}` })
  // Budget travellers ride the MRT; others take a cab when it saves 20+ min.
  const mrtOrTaxi = () => (opts.style !== 'budget' && taxi + 20 < t.minutes ? byTaxi(`saves ${t.minutes - taxi} min vs MRT`) : byMrt)

  // Over the walking limit: take the train if it is roughly as quick as walking.
  if (t && t.minutes <= walk + 8) return mrtOrTaxi()
  // MRT is much slower (awkward transfers) and the walk is still sane: walk it.
  if (walk <= 30) return onFoot
  if (t) return mrtOrTaxi()
  return byTaxi(mrtRunning(opts.atMs) ? 'no MRT nearby' : 'MRT closed at this hour')
}
