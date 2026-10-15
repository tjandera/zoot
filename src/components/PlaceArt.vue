<script setup>
import { computed, ref, watch } from 'vue'

/**
 * Procedural poster art for a place in the Zoot palette: sunburst, outlined skyline, category icon.
 * Shows the real photo instead when `image_url` is set (`npm run fetch:images`).
 */
const props = defineProps({ place: { type: Object, required: true }, height: { type: Number, default: 160 }, rounded: { type: Boolean, default: true } })

// [background, sunburst ray, icon disc, sparkles]
const SCHEMES = [
  ['#ffcc00', 'rgba(255,255,255,0.38)', '#ffffff', '#111111'],
  ['#fff4c2', 'rgba(255,204,0,0.55)', '#ffcc00', '#111111'],
  ['#f83878', 'rgba(255,255,255,0.22)', '#ffffff', '#111111'],
  ['#111111', 'rgba(255,204,0,0.2)', '#ffcc00', '#ffcc00']
]
const ICONS = {
  hawker: 'bi-egg-fried', food: 'bi-cup-hot-fill', gardens: 'bi-flower1', views: 'bi-binoculars-fill', museum: 'bi-easel-fill', temple: 'bi-bank2',
  heritage: 'bi-hourglass-split', nightlife: 'bi-moon-stars-fill', shopping: 'bi-bag-heart-fill', beach: 'bi-water', nature: 'bi-tree-fill',
  photo: 'bi-camera-fill', architecture: 'bi-buildings-fill', art: 'bi-palette-fill', coffee: 'bi-cup-straw', culture: 'bi-globe-asia-australia',
  family: 'bi-emoji-smile-fill', rides: 'bi-rocket-takeoff-fill'
}
const seed = computed(() => [...props.place.id].reduce((s, ch) => s + ch.charCodeAt(0), 0))
const scheme = computed(() => SCHEMES[seed.value % SCHEMES.length])
const icon = computed(() => ICONS[props.place.tags?.[0]] || 'bi-geo-alt-fill')
// A dead photo link falls back to the poster art.
const broken = ref(false)
watch(() => props.place.image_url, () => { broken.value = false })
const bars = computed(() => Array.from({ length: 9 }, (_, i) => 22 + ((seed.value * (i + 3)) % 48)))
</script>

<template>
  <div class="art" :class="{ rounded }" role="img" :aria-label="place.name"
    :style="{ height: height + 'px', '--bg': scheme[0], '--ray': scheme[1], '--disc': scheme[2], '--spark': scheme[3] }">
    <img v-if="place.image_url && !broken" :src="place.image_url" :alt="place.name" class="photo" loading="lazy" @error="broken = true" />
    <template v-else>
      <div class="skyline">
        <span v-for="(h, i) in bars" :key="i" :style="{ height: h + '%' }"></span>
      </div>
      <div class="disc"><i class="bi" :class="icon" aria-hidden="true"></i></div>
      <span class="spark s1">✦</span><span class="spark s2">✦</span><span class="spark s3">✦</span>
    </template>
    <span class="area-tag">{{ place.area }}</span>
  </div>
</template>

<style scoped>
.art {
  position: relative; overflow: hidden; border: var(--zt-bw) solid var(--zt-line);
  background-color: var(--bg);
  background-image: repeating-conic-gradient(from 0deg at 50% 78%, var(--ray) 0deg 10deg, transparent 10deg 20deg);
}
.art.rounded { border-radius: 18px; }
.photo { width: 100%; height: 100%; object-fit: cover; }
.skyline { position: absolute; left: 0; right: 0; bottom: -2px; height: 46%; display: flex; align-items: flex-end; gap: 3%; padding: 0 5%; }
.skyline span { flex: 1; background: #fff; border: 2px solid #111; border-bottom: none; border-radius: 5px 5px 0 0; }
.disc {
  position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%) rotate(-6deg);
  width: 34%; max-width: 92px; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center;
  background: var(--disc); color: #111; border: var(--zt-bw) solid #111; box-shadow: 4px 4px 0 #111; font-size: clamp(1.3rem, 5vw, 2.2rem);
}
.spark { position: absolute; color: var(--spark); font-size: 1rem; opacity: 0.9; }
.s1 { left: 12%; top: 16%; } .s2 { right: 14%; top: 24%; font-size: 1.4rem; } .s3 { right: 30%; top: 10%; font-size: 0.7rem; }
.area-tag { position: absolute; left: 10px; top: 10px; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111; background: #fff; border: 2px solid #111; padding: 2px 9px; border-radius: 999px; }
</style>
