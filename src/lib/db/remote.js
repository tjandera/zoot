import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

/**
 * Supabase adapter (Kayra: schema/RPC · Steven: auth/profiles).
 * Same interface as local.js. Check-ins go through the stamp_place() RPC,
 * which re-validates distance server-side — the client never inserts stamps directly.
 */
export function createRemoteDb() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })

  const must = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }

  return {
    kind: 'supabase',
    client: sb,

    async getSession() {
      const { data } = await sb.auth.getSession()
      return data.session
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session))
      return () => data.subscription.unsubscribe()
    },
    async signInWithEmail(email) {
      must(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth` } }))
    },
    async signInWithPassword(email, password) {
      return must(await sb.auth.signInWithPassword({ email, password })).session
    },
    async signUpWithPassword(email, password) {
      // session is null when "Confirm email" is on; the user must click the email link first.
      return must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth` } })).session
    },
    async signInWithGoogle() {
      must(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth` } }))
    },
    async signOut() {
      await sb.auth.signOut()
    },

    async getProfile(id) {
      return must(await sb.from('profiles').select('*').eq('id', id).maybeSingle())
    },
    async updateProfile(id, patch) {
      // Upsert so a missing row (signup trigger not run yet) is created, not an error.
      return must(await sb.from('profiles').upsert({ id, ...patch }).select().single())
    },
    async awardXp(id, amount) {
      // Return-to-gate bonus; stamp XP is added inside stamp_place().
      return must(await sb.rpc('award_return_bonus', { p_amount: amount }))
    },

    async listPlaces() {
      return must(await sb.from('places').select('*').order('name'))
    },

    async saveTrip(trip) {
      const row = {
        user_id: trip.user_id, origin_label: trip.origin.label, origin_lat: trip.origin.lat, origin_lng: trip.origin.lng,
        origin_kind: trip.origin.kind, start_at: trip.start_at, must_return_at: trip.must_return_at, style: trip.style,
        interests: trip.interests, energy: trip.energy, status: 'planned'
      }
      const saved = must(await sb.from('trips').insert(row).select().single())
      return { ...trip, id: saved.id }
    },

    async saveMission(m) {
      must(await sb.from('missions').upsert({
        id: m.id, trip_id: m.trip_id, title: m.title, payload_json: m, buffer_min: m.buffer_min,
        groq_model: m.groq_model, fallback_used: m.fallback_used
      }))
      must(await sb.from('mission_legs').delete().eq('mission_id', m.id))
      must(await sb.from('mission_legs').insert(m.legs.map((l) => ({
        mission_id: m.id, seq: l.seq, place_id: l.kind === 'return' ? null : l.place_id, kind: l.kind,
        travel_mode: l.travel_mode, travel_min: l.travel_min, stay_min: l.stay_min, xp: l.xp, status: l.status,
        arrive_at: l.arrive_iso, depart_at: l.depart_iso
      }))))
      return m
    },
    async getMission(id) {
      const row = must(await sb.from('missions').select('payload_json').eq('id', id).maybeSingle())
      return row?.payload_json || null
    },
    async listMissions() {
      const rows = must(await sb.from('missions').select('payload_json, created_at').order('created_at', { ascending: false }).limit(20))
      return rows.map((r) => r.payload_json)
    },

    async stampPlace({ place, position, fake, missionId }) {
      const stamp = must(await sb.rpc('stamp_place', {
        p_place_id: place.id, p_lat: position?.lat, p_lng: position?.lng, p_accuracy: position?.accuracy ?? 999,
        p_mission_id: missionId || null, p_fake_gps: Boolean(fake)
      }))
      const { data: { user } } = await sb.auth.getUser()
      const profile = user ? await this.getProfile(user.id) : null
      return { stamp: { ...stamp, area: place.area }, profile }
    },
    async listStamps(userId) {
      return must(await sb.from('stamps').select('*, places(area)').eq('user_id', userId).order('stamped_at'))
        .map((s) => ({ ...s, area: s.places?.area }))
    }
  }
}
