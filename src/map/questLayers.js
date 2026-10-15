import circle from '@turf/circle'
import { point } from '@turf/helpers'
import { travel } from '../lib/travel.js'
import { now } from '../lib/clock.js'
import { legShape, liveShape } from './routeShapes.js'

/**
 * GeoJSON layers drawn by MapLibre under the Three.js world:
 * the dotted quest path (by travel mode), the check-in geofence and stop labels.
 */
const EMPTY = { type: 'FeatureCollection', features: [] }
// Walk = pink dots, MRT = ink (yellow at night), taxi = orange. The casing keeps them readable on any ground.
const THEME = {
  day: { walk: '#f83878', mrt: '#111111', taxi: '#ff4d00', casing: '#ffffff', label: '#111111', halo: '#ffffff' },
  night: { walk: '#f83878', mrt: '#ffcc00', taxi: '#ff4d00', casing: '#000000', label: '#fff4c2', halo: '#111111' }
}
export const FENCE_COLOR = '#f83878'

export const DASH_SEQUENCE = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]
]

export function addQuestLayers(map, { dark = false, beforeId } = {}) {
  const c = dark ? THEME.night : THEME.day
  map.addSource('zt-route', { type: 'geojson', data: EMPTY })
  map.addSource('zt-fence', { type: 'geojson', data: EMPTY })
  map.addSource('zt-labels', { type: 'geojson', data: EMPTY })

  map.addLayer({ id: 'zt-fence-fill', type: 'fill', source: 'zt-fence', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 } }, beforeId)
  map.addLayer({ id: 'zt-fence-line', type: 'line', source: 'zt-fence', paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 1.5] } }, beforeId)
  map.addLayer({
    id: 'zt-route-casing', type: 'line', source: 'zt-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': c.casing, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4.5, 17, 13], 'line-opacity': ['case', ['get', 'active'], 1, 0.6] }
  }, beforeId)
  map.addLayer({
    id: 'zt-route', type: 'line', source: 'zt-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['match', ['get', 'mode'], ['mrt', 'bus'], c.mrt, 'taxi', c.taxi, c.walk],
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 17, 7],
      'line-opacity': ['case', ['get', 'active'], 1, 0.7],
      'line-dasharray': DASH_SEQUENCE[0]
    }
  }, beforeId)
  map.addLayer({
    id: 'zt-labels', type: 'symbol', source: 'zt-labels', minzoom: 13.5,
    layout: {
      'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12,
      'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-max-width': 10, 'text-allow-overlap': false
    },
    paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 2.2 }
  })
}

/**
 * Route from the traveller → every pending stop → home. Each segment keeps its travel mode.
 * The segment the traveller is on is `active` (bold); later ones are faded.
 * Segments follow real streets/transit lines (OneMap) once their shape is known,
 * and are straight lines until then or when OneMap is unavailable.
 */
export function routeGeoJSON(mission, here) {
  if (!mission) return EMPTY
  const pending = mission.legs.filter((l) => l.status === 'pending')
  const features = []
  let prev = here || null
  pending.forEach((l, i) => {
    if (prev) {
      // The live segment uses how you'd travel from *here*, not the planned leg from the last stop.
      const live = i === 0 && here
      const mode = live ? travel(here, l, { maxWalk: mission.prefs?.maxWalk, style: mission.style }).mode : l.travel_mode
      const atMs = live ? now() : Date.parse(l.arrive_iso) - l.travel_min * 60000
      const segments = (live ? liveShape(here, l, mode, atMs) : legShape(prev, l, mode, atMs)) ||
        [{ mode, coordinates: [[prev.lng, prev.lat], [l.lng, l.lat]] }]
      for (const s of segments) {
        features.push({
          type: 'Feature',
          properties: { mode: s.mode, active: i === 0 },
          geometry: { type: 'LineString', coordinates: s.coordinates }
        })
      }
    }
    prev = l
  })
  return { type: 'FeatureCollection', features }
}

export function fenceGeoJSON(leg, radiusM, color = FENCE_COLOR) {
  if (!leg) return EMPTY
  const c = circle(point([leg.lng, leg.lat]), radiusM / 1000, { steps: 48, units: 'kilometers' })
  c.properties = { color }
  return { type: 'FeatureCollection', features: [c] }
}

export function labelsGeoJSON(mission) {
  if (!mission) return EMPTY
  return {
    type: 'FeatureCollection',
    features: mission.legs.map((l) => ({
      type: 'Feature',
      properties: { label: l.kind === 'return' ? `⌂ ${mission.origin.label}` : `${l.seq}. ${l.name}` },
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] }
    }))
  }
}
