// Headless check of the golden path: `npm run test:planner`
import { readFileSync } from 'node:fs'
import { planDeterministic } from '../src/lib/planner.js'
import { fmtTime } from '../src/lib/hours.js'
import { validateMission } from '../src/lib/itinerarySchema.js'
import { mrtRunning, setWalkMatrix } from '../src/lib/travel.js'

const catalog = JSON.parse(readFileSync(new URL('../src/data/places.sg.json', import.meta.url)))
setWalkMatrix(JSON.parse(readFileSync(new URL('../src/data/walk-matrix.sg.json', import.meta.url))))
const T3 = { label: 'Changi Airport T3', kind: 'airport', lat: 1.3563, lng: 103.9866 }
const start = Date.parse('2026-09-25T02:00:00Z') // 10:00 SGT

const cases = [
  { name: 'Sonion 8h budget', hours: 8, style: 'budget', interests: ['hawker', 'gardens', 'photo'] },
  { name: 'Sonion 14h adventurous', hours: 14, style: 'adventurous', interests: ['hawker', 'gardens', 'photo'] },
  { name: 'Sonion 8h forced rain', hours: 8, style: 'budget', interests: ['hawker', 'gardens', 'photo'], forceRain: true },
  { name: 'Sonion 14h forced rain', hours: 14, style: 'adventurous', interests: ['hawker', 'gardens', 'photo'], forceRain: true },
  { name: '6h party', hours: 6, style: 'party', interests: ['nightlife', 'food'] },
  { name: 'Late 14h (MRT closes)', hours: 14, style: 'budget', interests: ['hawker', 'nightlife'], startOffsetH: 8 },
  { name: '2h refuse', hours: 2, style: 'budget', interests: ['hawker'] }
]

let failures = 0
for (const c of cases) {
  const s0 = start + (c.startOffsetH || 0) * 3600e3
  const ctx = {
    catalog, origin: T3, startMs: s0, mustReturnMs: s0 + c.hours * 3600e3,
    style: c.style, interests: c.interests, energy: 'med', maxWalk: 18, forceRain: c.forceRain
  }
  const r = planDeterministic(ctx)
  console.log(`\n## ${c.name}`)
  if (!r.ok) { console.log('REFUSED:', r.reason); continue }
  const m = r.mission
  const v = validateMission(m, new Set(catalog.map((p) => p.id)))
  if (!v.ok) { failures++; console.log('INVALID', v.errors) }
  console.log(m.title, `| out ${m.total_out_min} min | buffer ${m.buffer_min} min`)
  for (const l of m.legs) console.log(`  ${l.seq}. ${fmtTime(l.arrive_iso)}–${fmtTime(l.depart_iso)} ${l.name} [${l.travel_mode} ${l.travel_min}m, stay ${l.stay_min}] ${l.indoor === false ? 'OUTDOOR' : ''}`)
  if (m.buffer_min < 45) { failures++; console.log('FAIL: buffer < 45') }
  if (c.forceRain && m.legs.some((l) => l.kind === 'visit' && !l.indoor)) { failures++; console.log('FAIL: outdoor leg in rain') }
  const lateMrt = m.legs.find((l) => l.travel_mode === 'mrt' && !mrtRunning(Date.parse(l.arrive_iso) - l.travel_min * 60000))
  if (lateMrt) { failures++; console.log(`FAIL: MRT leg to ${lateMrt.name} after the trains stop`) }
}
if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1) }
console.log('\nAll planner checks passed.')

// ── Groq pipeline with a mocked /api/plan ────────────────────────────────
const { buildMission } = await import('../src/lib/groq.js')
const baseCtx = {
  catalog, origin: T3, startMs: start, mustReturnMs: start + 8 * 3600e3,
  style: 'budget', interests: ['hawker', 'gardens', 'photo'], energy: 'med', maxWalk: 18
}
const reply = (status, json) => async () => ({ status, ok: status < 300, json: async () => json })
const choice = (ids) => ({ model: 'mock-llama', choice: { schema: 'zoot.choice.v1', title: 'Satay & Supertrees', picks: ids.map((id) => ({ place_id: id, why: `Because ${id} rocks.` })) } })

async function groqCase(name, responses, expect) {
  let calls = 0
  globalThis.fetch = async (...a) => responses[Math.min(calls++, responses.length - 1)](...a)
  const r = await buildMission(baseCtx)
  const ok = expect(r, calls)
  console.log(`${ok ? 'ok  ' : 'FAIL'} groq: ${name} → ${r.source}, ${calls} call(s)${r.fallbackReason ? ` (${r.fallbackReason.slice(0, 60)})` : ''}`)
  if (!ok) failures++
}

await groqCase('valid picks are timed by the app', [reply(200, choice(['maxwell-food-centre', 'cloud-forest', 'supertree-grove']))],
  (r, calls) => r.ok && r.source === 'groq' && calls === 1 && r.mission.title === 'Satay & Supertrees' && r.mission.legs.at(-1).kind === 'return' && r.mission.buffer_min >= 90)
await groqCase('hallucinated id → retry once → valid', [reply(200, choice(['changi-hilton-rooftop'])), reply(200, choice(['maxwell-food-centre', 'supertree-grove']))],
  (r, calls) => r.ok && r.source === 'groq' && calls === 2)
await groqCase('invalid twice → deterministic fallback', [reply(200, { model: 'x', choice: { schema: 'nope' } })],
  (r, calls) => r.ok && r.source === 'fallback' && calls === 2)
await groqCase('no key (503) → fallback without retry', [reply(503, { error: 'GROQ_API_KEY is not set' })],
  (r, calls) => r.ok && r.source === 'fallback' && calls === 1)
await groqCase('network error → fallback', [async () => { throw new Error('offline') }],
  (r) => r.ok && r.source === 'fallback')

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1) }
console.log('All Groq pipeline checks passed.')
