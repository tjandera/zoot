import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

/**
 * Demo routes: landing → auth → onboarding quiz → plan form → 3D map.
 * meta.auth → needs a session; meta.onboarded → needs a travel style.
 * The 3D map is a lazy chunk so the landing page stays fast on phones.
 */
const routes = [
  { path: '/', name: 'landing', component: () => import('../views/LandingView.vue') },
  { path: '/auth', name: 'auth', component: () => import('../views/AuthView.vue') },
  { path: '/onboard', name: 'onboard', component: () => import('../views/OnboardView.vue'), meta: { auth: true } },
  { path: '/plan', name: 'plan', component: () => import('../views/PlanView.vue'), meta: { auth: true, onboarded: true, nav: true } },
  { path: '/map', name: 'map', component: () => import('../views/MapView.vue'), meta: { auth: true, nav: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const user = useUserStore()
  await user.init()
  if (to.meta.auth && !user.isAuthed) return { name: 'auth', query: { next: to.fullPath } }
  if (to.meta.onboarded && user.needsOnboarding) return { name: 'onboard', query: { next: to.fullPath } }
  return true
})
