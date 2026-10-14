import { reactive } from 'vue'
import destination from '@turf/destination'
import bearing from '@turf/bearing'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

/**
 * Shared traveller position. Real GPS via watchPosition, or fake GPS for demos
 * (WASD / arrow keys, tap-to-walk, teleport). Consumers read `geo` reactively.
 */
export const geo = reactive({
  lat: null,
  lng: null,
  accuracy: null,
  heading: 0,
  source: 'none', // 'gps' | 'fake' | 'none'
  fake: readFake(),
  error: null,
  walkTarget: null,
  speed: 6 // fake-GPS walk multiplier (1× = real walking pace)
})

let watchId = null

const distanceM = (a, b) => distance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: 'kilometers' }) * 1000

function readFake() {
  try { return localStorage.getItem('zoot.fakeGps') === '1' } catch { return false }
}

export function hasFix() {
  return geo.lat != null && geo.lng != null
}

export function startGps() {
  if (watchId != null || geo.fake) return
  if (!('geolocation' in navigator)) {
    geo.error = 'This browser has no geolocation. Use demo walk instead.'
    return
  }
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (geo.fake) return
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      if (hasFix() && distanceM(geo, next) > 2) geo.heading = bearing(point([geo.lng, geo.lat]), point([next.lng, next.lat]))
      Object.assign(geo, next, { accuracy: pos.coords.accuracy, source: 'gps', error: null })
    },
    (err) => { geo.error = err.message || 'Location unavailable' },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
  )
}

export function stopGps() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

export function setFake(on, seed) {
  geo.fake = on
  try { localStorage.setItem('zoot.fakeGps', on ? '1' : '0') } catch {}
  if (on) {
    stopGps()
    geo.source = 'fake'
    geo.accuracy = 5
    geo.error = null
    if (!hasFix() && seed) teleport(seed)
  } else {
    geo.walkTarget = null
    startGps()
  }
}

export function teleport({ lat, lng }) {
  Object.assign(geo, { lat, lng, accuracy: geo.fake ? 5 : geo.accuracy, source: geo.fake ? 'fake' : geo.source })
  geo.walkTarget = null
}

/** Move the fake traveller by metres along a compass bearing. */
export function nudge(meters, bearingDeg) {
  if (!hasFix()) return
  const p = destination(point([geo.lng, geo.lat]), meters / 1000, bearingDeg, { units: 'kilometers' })
  const [lng, lat] = p.geometry.coordinates
  geo.heading = bearingDeg
  geo.lat = lat
  geo.lng = lng
}

/** Tap-to-walk: the map loop calls stepWalk(dt) each frame while walkTarget is set. */
export function walkTo(target) {
  geo.walkTarget = target
}

export function stepWalk(dtMs) {
  if (!geo.walkTarget || !hasFix()) return false
  const remaining = distanceM(geo, geo.walkTarget)
  const step = 1.4 * geo.speed * (dtMs / 1000) // 1.4 m/s brisk walk × dev speed
  if (remaining <= step) {
    geo.lat = geo.walkTarget.lat
    geo.lng = geo.walkTarget.lng
    geo.walkTarget = null
    return true
  }
  nudge(step, bearing(point([geo.lng, geo.lat]), point([geo.walkTarget.lng, geo.walkTarget.lat])))
  return true
}
