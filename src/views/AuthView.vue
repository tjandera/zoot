<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const user = useUserStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const method = ref('password') // 'password' | 'link'
const isSignUp = ref(false)
const name = ref('')
const sent = ref(false)
const confirmSent = ref(false)
const busy = ref(false)
const error = ref('')

const next = () => (typeof route.query.next === 'string' ? route.query.next : '/plan')

// After the magic link lands back here, Supabase sets the session → move on.
watchEffect(() => {
  if (user.isAuthed) router.replace(user.needsOnboarding ? { name: 'onboard', query: { next: next() } } : next())
})

async function sendLink() {
  error.value = ''
  busy.value = true
  try {
    await user.sendMagicLink(email.value.trim())
    sent.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function submitPassword() {
  error.value = ''
  busy.value = true
  try {
    const signedIn = await user.passwordAuth(email.value.trim(), password.value, isSignUp.value)
    if (!signedIn) confirmSent.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

function switchMethod(m) {
  method.value = m
  error.value = ''
}

async function guest() {
  busy.value = true
  await user.continueAsGuest(name.value.trim() || 'Field Traveller')
  busy.value = false
}
</script>

<template>
  <main class="zt-page" style="max-width: 460px">
    <RouterLink to="/" class="btn btn-link px-0 mb-2"><i class="bi bi-arrow-left"></i> Back</RouterLink>
    <div class="zt-card overflow-hidden">
      <div class="banner" role="img" aria-label="A traveller reading a yellow Zoot passport"></div>
      <div class="p-4">
      <h1 class="title mb-1">Board the quest</h1>
      <p class="text-muted">Your stamps, XP and passport follow your account.</p>

      <div v-if="sent" class="alert alert-success">
        <i class="bi bi-envelope-check"></i> Check <b>{{ email }}</b> and tap the link on this device.
      </div>
      <div v-else-if="confirmSent" class="alert alert-success">
        <i class="bi bi-envelope-check"></i> Account created. Check <b>{{ email }}</b> to confirm it, then sign in.
      </div>
      <template v-else-if="user.canUseEmail">
        <div class="btn-group w-100 mb-3" role="group" aria-label="Sign-in method">
          <button type="button" class="btn btn-sm" :class="method === 'password' ? 'btn-dark' : 'btn-outline-dark'" @click="switchMethod('password')">Password</button>
          <button type="button" class="btn btn-sm" :class="method === 'link' ? 'btn-dark' : 'btn-outline-dark'" @click="switchMethod('link')">Magic link</button>
        </div>

        <form v-if="method === 'password'" @submit.prevent="submitPassword" class="mb-3">
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model="email" type="email" required class="form-control mb-2" placeholder="you@smu.edu.sg" autocomplete="email" />
          <label class="form-label" for="password">Password</label>
          <input id="password" v-model="password" type="password" required minlength="6" class="form-control mb-2" placeholder="At least 6 characters" :autocomplete="isSignUp ? 'new-password' : 'current-password'" />
          <button class="btn btn-primary w-100" :disabled="busy || !email || password.length < 6">{{ isSignUp ? 'Create account' : 'Sign in' }}</button>
          <p class="small text-center mt-2 mb-0">
            {{ isSignUp ? 'Already have an account?' : 'New here?' }}
            <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="isSignUp = !isSignUp; error = ''">{{ isSignUp ? 'Sign in' : 'Create an account' }}</button>
          </p>
        </form>

        <form v-else @submit.prevent="sendLink" class="mb-3">
          <label class="form-label" for="email">Email magic link</label>
          <input id="email" v-model="email" type="email" required class="form-control mb-2" placeholder="you@smu.edu.sg" autocomplete="email" />
          <button class="btn btn-primary w-100" :disabled="busy || !email">Send me a link</button>
        </form>
      </template>
      <div v-else class="alert alert-info tiny mb-3">
        <i class="bi bi-info-circle"></i> Email sign-in turns on when <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set. Guest mode saves on this device.
      </div>
      <p v-if="error" class="text-danger small">{{ error }}</p>

      <div class="divider my-3"><span>or</span></div>

      <label class="form-label" for="name">Play as guest</label>
      <input id="name" v-model="name" class="form-control mb-2" placeholder="Traveller name (optional)" maxlength="32" />
      <button class="btn btn-pop w-100" :disabled="busy" @click="guest"><i class="bi bi-person-walking"></i> Continue as guest</button>
      <p class="tiny text-muted mt-2 mb-0">Guest data stays in this browser. Nothing is sent anywhere.</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.divider { display: flex; align-items: center; gap: 10px; color: var(--zt-muted); font-weight: 800; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; }
.divider::before, .divider::after { content: ''; flex: 1; height: 2px; background: var(--zt-line); }
.banner { height: 150px; background: var(--zt-yellow) url('/brand/zoot-passport.jpg') center 28% / cover no-repeat; border-bottom: var(--zt-bw) solid var(--zt-line); border-radius: calc(var(--zt-radius) - 3px) calc(var(--zt-radius) - 3px) 0 0; }
.title { font-size: 2.4rem; }
</style>
