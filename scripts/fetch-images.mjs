// Fetches a real photo for every place in src/data/places.sg.json from Wikipedia / Wikimedia Commons
// (free, keyless, openly licensed) and writes image_url + image_credit back into the file.
//   node scripts/fetch-images.mjs          -> only places without image_url
//   node scripts/fetch-images.mjs --force  -> refetch everything
//   node scripts/fetch-images.mjs --only=id1,id2  -> refetch just these
// Then run `npm run seed:sql` to refresh supabase/seed.sql.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../src/data/places.sg.json', import.meta.url)
const places = JSON.parse(readFileSync(FILE, 'utf8'))
const force = process.argv.includes('--force')
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',')

// Wikipedia search terms for places whose name alone finds the wrong article.
const SEARCH = {
  'changi-point-boardwalk': 'Changi Point Coastal Walk',
  'hong-lim-food-centre': 'Hong Lim Market & Food Centre',
  'supertree-grove': 'Supertree Grove Gardens by the Bay',
  'siloso-beach': 'Siloso Beach Sentosa'
}
// Checked by eye: every candidate was wrong, so these keep the generated poster art.
const NO_PHOTO = new Set(['dempsey-hill'])
const UA = { 'User-Agent': 'ZootStudentApp/0.1 (IS216 school project)' }
const WIDTH = 900
const distanceKm = (a, b) => {
  const r = (x) => (x * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', origin: '*', ...params })
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: UA })
    if (res.ok) return res.json()
    if (res.status !== 429) throw new Error(`${host} ${res.status}`)
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  throw new Error(`${host} rate limited`)
}

/** Wikipedia article whose coordinates sit within 1.5 km of the place and which has a lead image. */
async function fromWikipedia(p) {
  const d = await api('en.wikipedia.org', {
    action: 'query', generator: 'search', gsrsearch: SEARCH[p.id] || `${p.name} Singapore`, gsrlimit: '5',
    prop: 'pageimages|coordinates', piprop: 'thumbnail', pithumbsize: String(WIDTH)
  })
  const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index)
  for (const pg of pages) {
    const c = pg.coordinates?.[0]
    if (!pg.thumbnail || !c) continue
    if (distanceKm(p, { lat: c.lat, lng: c.lon }) > 1.5) continue
    return { url: pg.thumbnail.source, credit: `Wikipedia: ${pg.title}` }
  }
}

/** Best text match on Commons among photos geotagged within 1 km (nearest-only picks up buses and dinner plates). */
async function fromCommons(p) {
  const d = await api('commons.wikimedia.org', {
    action: 'query', generator: 'search', gsrnamespace: '6', gsrlimit: '10',
    gsrsearch: `${SEARCH[p.id] || p.name} filetype:bitmap nearcoord:1km,${p.lat},${p.lng}`,
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH)
  })
  const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index)
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0]
    if (!ii?.thumburl || !/\.jpe?g$/i.test(pg.title)) continue
    const artist = (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim()
    return { url: ii.thumburl, credit: `Wikimedia Commons${artist ? ': ' + artist : ''}` }
  }
}

let ok = 0
const missing = []
for (const p of places) {
  if (NO_PHOTO.has(p.id)) { delete p.image_url; delete p.image_credit; continue }
  if (only ? !only.includes(p.id) : p.image_url && !force) { if (p.image_url) ok++; continue }
  let hit
  try { hit = (await fromWikipedia(p)) || (await fromCommons(p)) } catch (err) { console.warn(p.id, err.message) }
  if (hit) { p.image_url = hit.url; p.image_credit = hit.credit; ok++; console.log('ok  ', p.id, '<-', hit.credit) }
  else { missing.push(p.id); console.log('MISS', p.id) }
  await new Promise((r) => setTimeout(r, 700))
}
// Edit the raw lines (one place per line) so the hand-written layout survives: strip old image fields, append new ones.
const byId = new Map(places.map((p) => [p.id, p]))
const out = readFileSync(FILE, 'utf8').replace(/^(\s*\{ "id": "([^"]+)".*?)(, "image_url": "[^"]*", "image_credit": "(?:[^"\\]|\\.)*")? \}/gm, (_, head, id) => {
  const p = byId.get(id)
  return head + (p?.image_url ? `, "image_url": ${JSON.stringify(p.image_url)}, "image_credit": ${JSON.stringify(p.image_credit)}` : '') + ' }'
})
writeFileSync(FILE, out)
console.log(`\n${ok}/${places.length} have images.`, missing.length ? `Missing: ${missing.join(', ')}` : '')
