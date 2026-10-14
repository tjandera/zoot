/**
 * Guest-mode adapter: same interface as remote.js, stored in localStorage.
 * Lets the app run with zero keys (and keeps the demo alive if Supabase is down).
 */
const K = { session: 'zoot.session', profile: 'zoot.profile' }

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
        avatar_seed: Math.floor(Math.random() * 1e6), cover_color: '#ffcc00',
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
  }
}
