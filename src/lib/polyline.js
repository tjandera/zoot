/**
 * Google encoded-polyline decoder (precision 5), the format OneMap uses for
 * route_geometry and transit legGeometry. Returns GeoJSON order: [[lng, lat], ...].
 */
export function decodePolyline(str, precision = 5) {
  const factor = 10 ** precision
  const out = []
  let lat = 0
  let lng = 0
  let i = 0
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0
      let result = 0
      let b
      do {
        b = str.charCodeAt(i++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    out.push([lng / factor, lat / factor])
  }
  return out
}

/** Stable key for a point: 4 decimals ≈ 11 m, matches how places and origins are stored. */
export const coordKey = (p) => `${(+p.lat).toFixed(4)},${(+p.lng).toFixed(4)}`

/** Direction-free key for a pair; `reversed` says whether a→b runs against the stored order. */
export function pairKey(a, b) {
  const ka = coordKey(a)
  const kb = coordKey(b)
  return ka <= kb ? { key: `${ka}|${kb}`, reversed: false } : { key: `${kb}|${ka}`, reversed: true }
}
