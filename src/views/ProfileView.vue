<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useUiStore } from '../stores/ui.js'
import { STYLES } from '../data/origins.js'

/** Profile (Steven's lane). Demo build: name, travel style, theme and sign out. */
const user = useUserStore()
const ui = useUiStore()
const router = useRouter()
const editing = ref(false)
const name = ref(user.profile?.display_name || '')
const style = computed(() => STYLES[user.profile?.style] || STYLES.budget)
const email = computed(() => user.session?.user?.email)

async function saveName() {
  await user.updateProfile({ display_name: name.value.trim() || 'Field Traveller' })
  editing.value = false
}
async function signOut() {
  await user.signOut()
  router.push('/')
}
</script>

<template>
  <main class="zt-page">
    <section class="zt-card p-4 text-center">
      <div class="avatar mx-auto mb-3" :style="{ background: style.color, color: style.on }">
        <i class="bi" :class="style.icon"></i>
      </div>
      <div v-if="!editing" class="d-flex justify-content-center align-items-center gap-2">
        <h1 class="name mb-0">{{ user.profile?.display_name }}</h1>
        <button class="btn btn-sm btn-link p-0" @click="name = user.profile?.display_name || ''; editing = true" aria-label="Edit name"><i class="bi bi-pencil"></i></button>
      </div>
      <form v-else class="d-flex gap-2 justify-content-center" @submit.prevent="saveName">
        <input v-model="name" class="form-control form-control-sm" style="max-width: 200px" maxlength="32" aria-label="Display name" />
        <button class="btn btn-sm btn-primary">Save</button>
      </form>
      <div v-if="email" class="text-muted small mt-1">{{ email }}</div>
      <div class="mt-2"><span class="zt-pill"><i class="bi" :class="style.icon"></i> {{ style.label }} traveller</span></div>
    </section>

    <div class="list-group mt-3 zt-card overflow-hidden">
      <RouterLink to="/plan" class="list-group-item list-group-item-action"><i class="bi bi-plus-circle"></i> Plan a layover</RouterLink>
      <RouterLink to="/onboard" class="list-group-item list-group-item-action"><i class="bi bi-shuffle"></i> Retake the style quiz</RouterLink>
      <button class="list-group-item list-group-item-action" @click="ui.toggleTheme()"><i class="bi" :class="ui.theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i> {{ ui.theme === 'dark' ? 'Light' : 'Dark' }} mode</button>
    </div>

    <p class="tiny text-muted text-center mt-3">Signed in via {{ user.mode === 'supabase' ? 'Supabase' : 'guest mode (this device)' }}</p>
    <button class="btn btn-outline-danger w-100" @click="signOut"><i class="bi bi-box-arrow-right"></i> Sign out</button>
  </main>
</template>

<style scoped>
.name { font-size: 2.2rem; }
.avatar { width: 96px; height: 96px; border-radius: 30px; display: grid; place-items: center; font-size: 2.6rem; transform: rotate(-4deg); border: var(--zt-bw) solid var(--zt-line); box-shadow: var(--zt-shadow); }
.list-group { border: var(--zt-bw) solid var(--zt-line); border-radius: var(--zt-radius); }
.list-group-item { display: flex; gap: 10px; align-items: center; font-weight: 700; font-size: 0.86rem; text-transform: uppercase; letter-spacing: 0.02em; background: var(--zt-card); color: var(--zt-ink); border-left: none; border-right: none; }
.list-group-item:hover { background: var(--zt-yellow-soft); color: #111; }
</style>
