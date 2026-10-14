<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useUiStore } from '../stores/ui.js'

/** Landing page. Copy and layout follow the Zoot pitch deck (Matthew: design QA). */
const router = useRouter()
const user = useUserStore()
const ui = useUiStore()

const worries = [
  'How much buffer do I need to get back?',
  'No SIM. No clue how the MRT works.',
  'How long will immigration take?'
]
const problems = [
  'Static lists leave travellers to figure out routing, timing and weather.',
  'Layover passengers fear immigration delays, transit confusion and missing their flight.',
  'Guided tours can’t personalise the day for one traveller.'
]
const features = [
  { icon: 'bi-geo-alt-fill', title: '3D quest map', text: 'A tilted toy-city Singapore with your route, the weather and a live countdown to your gate, all on one screen.' },
  { icon: 'bi-stars', title: 'AI place picker', text: 'Tell it your hours and interests. It picks the stops, the app times every leg, and it refuses plans that risk your flight.' },
  { icon: 'bi-patch-check-fill', title: 'Check-ins and XP', text: 'Walk into a stop’s ring, slam a chop into your 3D passport and level up as the trip goes on.' }
]

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>

<template>
  <main class="landing">
    <section class="hero zt-rays">
      <header class="top container d-flex align-items-center justify-content-between">
        <span class="zt-pill paper">Singapore · Changi</span>
        <div class="d-flex gap-2">
          <button class="btn btn-soft btn-sm" @click="ui.toggleTheme()" :aria-label="`Switch to ${ui.theme === 'dark' ? 'light' : 'dark'} mode`">
            <i class="bi" :class="ui.theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'"></i>
          </button>
          <RouterLink v-if="!user.isAuthed" to="/auth" class="btn btn-soft btn-sm">Sign in</RouterLink>
          <RouterLink v-else to="/map" class="btn btn-soft btn-sm">Open map</RouterLink>
        </div>
      </header>

      <div class="container hero-body">
        <div class="row align-items-center g-4">
          <div class="col-lg-6">
            <img src="/brand/zoot-wordmark.png" alt="Zoot" class="wordmark" width="581" height="282" />
            <p class="tagline">Short layover, just Zoot!</p>
            <!-- <h1 class="headline">You land in Singapore.<br />Your flight leaves in <span class="hours">10 hours.</span></h1> -->
            <!-- <p class="lede">Zoot turns those hours into a timed walking quest across the city. Planned to the minute, played on the street, and it always gets you back to the gate.</p> -->
            <div class="d-flex flex-wrap gap-3 align-items-center">
              <button class="btn btn-pop btn-lg" @click="router.push('/plan')"><i class="bi bi-play-fill"></i> Start a layover</button>
              <RouterLink to="/place/supertree-grove" class="btn btn-soft btn-lg">Peek at a stop</RouterLink>
            </div>
            <div class="stats">
              <div><b>89</b><span>Singapore stops</span></div>
              <div><b>90</b><span>min airport buffer</span></div>
              <div><b>4</b><span>travel styles</span></div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="scene" aria-hidden="true">
              <img src="/brand/zoot-runner.webp" alt="" class="runner" width="900" height="604" />
              <div v-for="(w, i) in worries" :key="w" class="bubble" :class="'b' + (i + 1)">{{ w }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container block">
      <h2 class="zt-display block-title">What is Zoot?</h2>
      <div class="d-flex flex-wrap gap-2 mb-4">
        <span class="zt-pill big">On-the-go trip planner</span>
        <span class="zt-pill big">Designed for short layovers</span>
        <span class="zt-pill big">Interactive planning</span>
      </div>
      <div class="row g-3">
        <div v-for="(f, i) in features" :key="f.title" class="col-md-4">
          <div class="zt-card p-4 h-100 feature">
            <span class="zt-pill mb-3">Feature {{ i + 1 }}</span>
            <div class="feature-icon"><i class="bi" :class="f.icon"></i></div>
            <h3 class="h5 mt-3">{{ f.title }}</h3>
            <p class="text-muted mb-0">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>


    <section class="container block">
      <div class="persona">
        <div class="row g-4 align-items-center">
          <div class="col-md-5">
            <span class="zt-pill ink mb-2">Meet Sam, 21</span>
            <h2 class="zt-display persona-title">He has a 8 hour layover in Singapore. What does he do?</h2>
            <p class="mb-0">He stays in the terminal. Not because there’s nothing to do, but because he doesn't know what’s safe to try. With Zoot he gets this instead:</p>
          </div>
          <div class="col-md-7">
            <ol class="timeline list-unstyled mb-0">
              <li><b class="mono">10:00</b> Lands at T3, 30 min to clear immigration</li>
              <li><b class="mono">10:30</b> <span class="zt-pill ink">MRT</span> Into town, every leg timed</li>
              <li><b class="mono">13:00</b> Hawker lunch, then Gardens by the Bay (domes if it rains)</li>
              <li><b class="mono">16:30</b> Back at T3 · <span class="zt-pill pink">90 min buffer</span></li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="container block">
      <h2 class="zt-display block-title">Endless options, ticking clock</h2>
      <ol class="problems list-unstyled">
        <li v-for="(p, i) in problems" :key="p" class="zt-band"><b class="zt-display">{{ i + 1 }}</b><span>{{ p }}</span></li>
      </ol>
    </section>

    <footer class="container pb-5 text-center tiny text-muted">
      <button class="btn btn-pop btn-lg mb-4" @click="scrollToTop"> Ready to try?</button><br />
      <img src="/brand/zoot-badge-192.png" alt="" width="44" height="44" class="mb-2" /><br />
    
    </footer>
  </main>
</template>

<style scoped>
/* ---------- Page ---------- */
.landing {
  min-height: 100vh;
}

/* ---------- Hero ---------- */
.hero {
  padding-bottom: 44px;
  overflow: hidden;
  color: #111;
  border-bottom: var(--zt-bw) solid #111;
}

.top {
  padding-top: 16px;
  padding-bottom: 8px;
}

.hero :deep(.btn-soft) {
  --bs-btn-bg: #fff;
  --bs-btn-color: #111;
  --bs-btn-border-color: #111;
  box-shadow: 0 4px 0 #111;
}

.hero :deep(.btn-pop) {
  --bs-btn-border-color: #111;
  box-shadow: 0 4px 0 #111;
}

.hero :deep(.zt-pill.paper) {
  color: #111;
  background: #fff;
  border-color: #111;
}

.hero-body {
  padding-top: 12px;
}

.wordmark {
  display: block;
  width: min(300px, 62vw);
  height: auto;
  margin-left: -6px;
}

.tagline {
  margin: 2px 0 18px;
  font-family: var(--zt-font-head);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.headline {
  margin-bottom: 14px;
  font-size: clamp(2rem, 5vw, 3.6rem);
}

.hours {
  color: var(--zt-orange);
  white-space: nowrap;
}

.lede {
  max-width: 34rem;
  margin-bottom: 22px;
  font-size: 1.02rem;
  font-weight: 500;
}

/* Stats */
.stats {
  display: flex;
  gap: 26px;
  margin-top: 26px;
}

.stats div {
  display: flex;
  flex-direction: column;
}

.stats b {
  font-family: var(--zt-font-display);
  font-size: 2.4rem;
  font-weight: 400;
  line-height: 1;
}

.stats span {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* ---------- Hero scene & speech bubbles ---------- */
.scene {
  position: relative;
  max-width: 560px;
  margin: 0 auto;
  padding: 36px 0 10px;
}

.runner {
  display: block;
  width: 100%;
  height: auto;
  animation: zt-bob 3.2s ease-in-out infinite;
}

.bubble {
  position: absolute;
  max-width: 190px;
  padding: 9px 13px;
  font-family: var(--zt-font-head);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  text-transform: uppercase;
  color: #111;
  background: #fff;
  border: var(--zt-bw) solid #111;
  border-radius: 18px;
  box-shadow: 3px 3px 0 #111;
}

/* Tail (points down by default) */
.bubble::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: 26px;
  width: 14px;
  height: 14px;
  background: #fff;
  border: var(--zt-bw) solid #111;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.b1 {
  top: 0;
  left: 0;
  transform: rotate(-4deg);
}

.b2 {
  top: 4%;
  right: 0;
  transform: rotate(3deg);
}

.b2::after {
  right: 26px;
  left: auto;
}

.b3 {
  bottom: 4%;
  left: 4%;
  transform: rotate(2deg);
}

/* Tail points up */
.b3::after {
  top: -9px;
  bottom: auto;
  border: var(--zt-bw) solid #111;
  border-right: none;
  border-bottom: none;
}

/* ---------- Content blocks ---------- */
.block {
  padding-top: 48px;
}

.block-title {
  margin-bottom: 18px;
  font-size: clamp(2.2rem, 6vw, 3.4rem);
}

/* Problems */
.problems {
  display: grid;
  gap: 12px;
  margin: 0;
}

.problems li {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  font-family: var(--zt-font-head);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  text-transform: uppercase;
  box-shadow: 4px 4px 0 var(--zt-shadow-color);
}

.problems b {
  min-width: 26px;
  font-size: 2.4rem;
  line-height: 1;
}

/* Features */
.zt-pill.big {
  padding: 6px 16px;
  font-size: 0.82rem;
  border-width: var(--zt-bw);
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  font-size: 1.5rem;
  color: #111;
  background: var(--zt-yellow);
  border: var(--zt-bw) solid var(--zt-line);
  border-radius: 50%;
}

.feature .zt-pill {
  display: inline-flex;
}

/* Persona */
.persona {
  padding: 28px;
  color: #111;
  background: var(--zt-yellow-soft);
  border: var(--zt-bw) solid #111;
  border-radius: 26px;
  box-shadow: 6px 6px 0 var(--zt-shadow-color);
}

.persona-title {
  margin: 4px 0 8px;
  font-size: 2.6rem;
}

/* Timeline */
.timeline li {
  position: relative;
  padding: 10px 0 10px 20px;
  font-weight: 500;
  border-left: 3px solid #111;
}

.timeline li::before {
  content: '';
  position: absolute;
  top: 14px;
  left: -9px;
  width: 15px;
  height: 15px;
  background: var(--zt-yellow);
  border: 3px solid #111;
  border-radius: 50%;
}

.timeline b {
  margin-right: 8px;
  font-weight: 800;
}

/* ---------- Footer ---------- */
footer {
  padding-top: 48px;
}

/* ---------- Responsive ---------- */
@media (max-width: 991px) {
  .scene {
    padding-top: 56px;
  }

  .bubble {
    max-width: 160px;
    font-size: 0.7rem;
  }
}
</style>
