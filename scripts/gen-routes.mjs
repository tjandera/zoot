// Real walking routes between nearby places, from OneMap: `npm run routes:gen`
// Writes two files (resumable: pairs already present are skipped, so re-runs only fill gaps):
//   src/data/walk-matrix.sg.json    { "lat,lng|lat,lng": [metres, seconds] }   → travel.js (planner minutes)
//   src/data/walk-geometry.sg.json  { "lat,lng|lat,lng": "<encoded polyline>" } → map only, lazy-loaded
// Keys are direction-free (see pairKey); geometry runs from the first point to the second.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { ORIGINS } from '../src/data/origins.js'
import { pairKey } from '../src/lib/polyline.js'
import { onemapStreetRoute } from '../api/_lib/onemap.js'

const MAX_STRAIGHT_M = 2000 // beyond this travel.js picks MRT/taxi anyway (walk > 30 min)
const PER_MINUTE = 200 // OneMap allows ~250 calls/min
const data = (f) => new URL(`../src/data/${f}`, import.meta.url)
const load = (f) => (existsSync(data(f)) ? JSON.parse(readFileSync(data(f))) : {})

const places = JSON.parse(readFileSync(data('places.sg.json')))
const nodes = [...places, ...ORIGINS].map((p) => ({ name: p.name || p.label, lat: p.lat, lng: p.lng }))

const R = 6371000
const rad = (x) => (x * Math.PI) / 180
const straight = (a, b) =>
  2 * R * Math.asin(Math.sqrt(Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2))

const matrix = load('walk-matrix.sg.json')
const geometry = load('walk-geometry.sg.json')
const todo = new Map()
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const [a, b] = [nodes[i], nodes[j]]
    if (straight(a, b) > MAX_STRAIGHT_M) continue
    const { key, reversed } = pairKey(a, b)
    if (key.split('|')[0] === key.split('|')[1] || matrix[key] || todo.has(key)) continue
    todo.set(key, reversed ? [b, a] : [a, b])
  }
}
console.log(`${Object.keys(matrix).length} pairs cached, ${todo.size} to fetch (~${Math.ceil(todo.size / PER_MINUTE)} min)`)

const save = () => {
  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)))
  writeFileSync(data('walk-matrix.sg.json'), JSON.stringify(sorted(matrix)))
  writeFileSync(data('walk-geometry.sg.json'), JSON.stringify(sorted(geometry)))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let done = 0
let failed = 0
for (const [key, [a, b]] of todo) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await onemapStreetRoute(a, b, 'walk')
      matrix[key] = [Math.round(r.meters), Math.round(r.seconds)]
      geometry[key] = r.encoded
      break
    } catch (err) {
      if (err.status === 404) { failed++; break }
      if (err.status === 503 || err.status === 401) { save(); throw err } // token problem: keep progress, stop
      if (attempt === 3) { failed++; console.warn(`  skip ${a.name} ↔ ${b.name}: ${err.message}`) }
      else await sleep(attempt * 5000)
    }
  }
  if (++done % 50 === 0) { save(); console.log(`  ${done}/${todo.size}`) }
  await sleep(60000 / PER_MINUTE)
}
save()
console.log(`Done: ${Object.keys(matrix).length} pairs in the matrix (${failed} without a route).`)
