import { onemapConfigured, onemapStreetRoute, onemapTransitRoute } from './_lib/onemap.js'

/**
 * POST /api/route — street-following geometry for one map segment.
 *   body: { from: {lat,lng}, to: {lat,lng}, mode: 'walk'|'mrt'|'taxi', at_iso? }
 *   200:  { mode, minutes, distance_m, segments: [{ mode, line?, coordinates: [[lng,lat],...] }] }
 * Planner minutes still come from travel.js; this only shapes the line on the map.
 * Any failure → the client keeps drawing a straight segment.
 */
const inSingapore = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat > 1.15 && p.lat < 1.48 && p.lng > 103.6 && p.lng < 104.1

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!onemapConfigured()) return res.status(503).json({ error: 'OneMap is not configured; client should draw straight segments.' })
  const { from, to, mode = 'walk', at_iso } = req.body || {}
  if (!inSingapore(from) || !inSingapore(to)) return res.status(400).json({ error: 'from/to must be points in Singapore' })
  if (!['walk', 'mrt', 'taxi'].includes(mode)) return res.status(400).json({ error: 'mode must be walk, mrt or taxi' })

  try {
    const atMs = Date.parse(at_iso) || Date.now()
    const r = mode === 'mrt' ? await onemapTransitRoute(from, to, atMs) : await onemapStreetRoute(from, to, mode === 'taxi' ? 'drive' : 'walk')
    return res.status(200).json({ mode, minutes: Math.round(r.seconds / 60), distance_m: r.meters, segments: r.segments })
  } catch (err) {
    return res.status(err.status === 404 ? 404 : 502).json({ error: String(err.message || err) })
  }
}
