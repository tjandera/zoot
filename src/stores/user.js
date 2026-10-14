import { defineStore } from 'pinia'
import { getDb, isGuestMode, setGuestMode } from '../lib/db/index.js'
import { HAS_SUPABASE } from '../lib/config.js'
import { levelFor, titleFor } from '../lib/xp.js'

/** Session + profile (Steven's lane). */
export const useUserStore = defineStore('user', {
  state: () => ({ session: null, profile: null, ready: false, mode: 'local', _init: null }),
  getters: {
    isAuthed: (s) => Boolean(s.session?.user),
    userId: (s) => s.session?.user?.id || null,
    needsOnboarding: (s) => Boolean(s.session?.user) && !s.profile?.style,
    level: (s) => levelFor(s.profile?.xp || 0),
    title() { return titleFor(this.level.level) },
    canUseEmail: () => HAS_SUPABASE
  },
  actions: {
    init() {
      if (!this._init) this._init = this._load()
      return this._init
    },
    async _load() {
      const db = await getDb()
      this.mode = db.kind
      this.session = await db.getSession()
      if (this.session?.user) await this.refreshProfile()
      db.onAuthChange(async (session) => {
        this.session = session
        if (session?.user) await this.refreshProfile()
        else this.profile = null
      })
      this.ready = true
    },
    async refreshProfile() {
      const db = await getDb()
      let p = await db.getProfile(this.userId)
      // The signup trigger creates the row; if it has not landed yet, create a minimal one.
      if (!p && db.kind === 'supabase') p = await db.updateProfile(this.userId, { display_name: this.session.user.email?.split('@')[0] })
      this.profile = p
    },
    async continueAsGuest(name) {
      setGuestMode(true)
      this._init = null
      const db = await getDb()
      this.mode = db.kind
      this.session = await db.signInGuest(name)
      await this.refreshProfile()
      this.ready = true
    },
    async sendMagicLink(email) {
      setGuestMode(false)
      this._init = null
      const db = await getDb()
      await db.signInWithEmail(email)
    },
    /** Email + password. Returns true when signed in; false when sign-up is waiting on email confirmation. */
    async passwordAuth(email, password, isSignUp = false) {
      setGuestMode(false)
      this._init = null
      const db = await getDb()
      this.mode = db.kind
      const session = isSignUp ? await db.signUpWithPassword(email, password) : await db.signInWithPassword(email, password)
      if (!session) return false
      this.session = session
      await this.refreshProfile()
      this.ready = true
      return true
    },
    async updateProfile(patch) {
      const db = await getDb()
      this.profile = await db.updateProfile(this.userId, patch)
    },
    setProfile(p) {
      if (p) this.profile = p
    },
    async signOut() {
      const db = await getDb()
      await db.signOut()
      this.session = null
      this.profile = null
      if (HAS_SUPABASE && isGuestMode()) setGuestMode(false)
      this._init = null
    }
  }
})
