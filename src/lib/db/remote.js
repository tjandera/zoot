import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

/**
 * Supabase adapter (Kayra: schema · Steven: auth/profiles). Same interface as local.js.
 * Sign-up creates the auth user; the on_auth_user_created trigger writes its `profiles` row.
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
    }
  }
}
