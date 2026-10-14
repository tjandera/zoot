import { checkInStatus, sameSgDay } from '../checkin.js'
import { DEFAULT_COVER } from '../brand.js'

/**
 * Guest-mode adapter: same interface as remote.js, stored in localStorage.
 * Lets the app run with zero keys (and keeps the demo alive if Supabase is down).
 */
const K = { session: 'zoot.session', profile: 'zoot.profile', trips: 'zoot.trips', missions: 'zoot.missions', stamps: 'zoot.stamps' }

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}


export const localDb = {
  kind: 'local',

  async getSession() {
    return read(K.session, null)
  },
  onAuthChange() {
    return () => {}
  },
  async signInGuest(displayName) {
    let profile = read(K.profile, null)
    if (!profile) {
      const id = 'guest-' + crypto.randomUUID()
      profile = {
        id, display_name: displayName || 'Field Traveller', style: null, xp: 0, home_city: null, is_verified: false,
        avatar_seed: Math.floor(Math.random() * 1e6), cover_color: DEFAULT_COVER,
        created_at: new Date().toISOString()
      }
      write(K.profile, profile)
    } else if (displayName) {
      profile.display_name = displayName
      write(K.profile, profile)
    }
    const session = { user: { id: profile.id, email: null }, guest: true }
    write(K.session, session)
    return session
  },
  async signInWithEmail() {
    throw new Error('Email sign-in needs Supabase keys. Use guest mode for now.')
  },
  async signInWithPassword() {
    throw new Error('Password sign-in needs Supabase keys. Use guest mode for now.')
  },
  async signUpWithPassword() {
    throw new Error('Password sign-up needs Supabase keys. Use guest mode for now.')
  },
  async signOut() {
    localStorage.removeItem(K.session)
  },
  async resetAll() {
    Object.values(K).forEach((k) => localStorage.removeItem(k))
  },

  async getProfile(id) {
    const p = read(K.profile, null)
    return p && p.id === id ? p : null
  },
  async updateProfile(id, patch) {
    const p = { ...read(K.profile, {}), ...patch, id }
    write(K.profile, p)
    return p
  },
  async awardXp(id, amount) {
    const p = read(K.profile, null)
    if (!p || p.id !== id) return null
    p.xp = (p.xp || 0) + amount
    write(K.profile, p)
    return p
  },

  async listPlaces() {
    return [] // guest mode uses the bundled catalog
  },

  async saveTrip(trip) {
    const trips = read(K.trips, [])
    const row = { ...trip, id: trip.id || crypto.randomUUID(), created_at: new Date().toISOString() }
    write(K.trips, [row, ...trips.filter((t) => t.id !== row.id)].slice(0, 20))
    return row
  },

  async saveMission(mission) {
    const all = read(K.missions, {})
    all[mission.id] = mission
    write(K.missions, all)
    return mission
  },
  async getMission(id) {
    return read(K.missions, {})[id] || null
  },
  async listMissions() {
    return Object.values(read(K.missions, {})).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  /** Mirrors stamp_place(): distance + accuracy + once-per-day, then XP. */
  async stampPlace({ userId, place, position, fake, missionId, xp, dev }) {
    if (!dev) {
      const s = checkInStatus({ place, position, fake })
      if (!s.ok) throw new Error(s.message)
    }
    const stamps = read(K.stamps, [])
    const now = Date.now()
    if (stamps.some((s) => s.user_id === userId && s.place_id === place.id && sameSgDay(Date.parse(s.stamped_at), now))) {
      throw new Error('Already stamped here today. One chop per place per day.')
    }
    const stamp = {
      id: crypto.randomUUID(), user_id: userId, place_id: place.id, mission_id: missionId || null,
      lat: position?.lat ?? place.lat, lng: position?.lng ?? place.lng, accuracy_m: position?.accuracy ?? null,
      xp, area: place.area, stamped_at: new Date(now).toISOString()
    }
    stamps.push(stamp)
    write(K.stamps, stamps)
    const profile = await this.awardXp(userId, xp)
    return { stamp, profile }
  },
  async listStamps(userId) {
    return read(K.stamps, []).filter((s) => s.user_id === userId)
  }
}
