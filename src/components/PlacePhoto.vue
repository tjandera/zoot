<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * Small photo thumbnail for a place that opens a full-screen lightbox on tap.
 * Photos come from Wikipedia / Wikimedia Commons via `npm run fetch:images`; renders nothing without one.
 */
const props = defineProps({ place: { type: Object, default: null }, size: { type: Number, default: 64 } })

const open = ref(false)
const broken = ref(false)
watch(() => props.place?.image_url, () => { broken.value = false })

function onKey(e) { if (e.key === 'Escape') open.value = false }
watch(open, (on) => (on ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <button v-if="place?.image_url && !broken" type="button" class="thumb" :style="{ width: size + 'px', height: size + 'px' }"
    :aria-label="`Enlarge photo of ${place.name}`" @click="open = true">
    <img :src="place.image_url" :alt="place.name" loading="lazy" @error="broken = true" />
    <span class="zoom"><i class="bi bi-arrows-angle-expand" aria-hidden="true"></i></span>
  </button>

  <Teleport to="body">
    <Transition name="zt-fade">
      <div v-if="open" class="lightbox" role="dialog" aria-modal="true" :aria-label="place.name" @click.self="open = false">
        <figure class="frame zt-card">
          <img :src="place.image_url" :alt="place.name" />
          <figcaption class="d-flex justify-content-between align-items-center gap-2 px-3 py-2">
            <div>
              <div class="fw-800">{{ place.name }}</div>
              <div v-if="place.image_credit" class="tiny text-muted">Photo: {{ place.image_credit }}</div>
            </div>
            <button type="button" class="btn btn-soft btn-sm" aria-label="Close photo" @click="open = false" autofocus><i class="bi bi-x-lg"></i></button>
          </figcaption>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.thumb {
  position: relative; flex: none; padding: 0; overflow: hidden; cursor: zoom-in;
  border: var(--zt-bw) solid var(--zt-line); border-radius: 14px; background: var(--zt-yellow-pale); box-shadow: var(--zt-shadow-sm);
  transition: transform 0.15s;
}
.thumb:hover, .thumb:focus-visible { transform: rotate(-2deg) scale(1.04); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.zoom {
  position: absolute; right: 3px; bottom: 3px; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
  font-size: 0.6rem; background: #fff; color: #111; border: 2px solid #111;
}
.lightbox { position: fixed; inset: 0; z-index: 1950; display: grid; place-items: center; padding: 16px; background: rgba(17, 17, 17, 0.75); cursor: zoom-out; }
.frame { margin: 0; width: min(900px, 100%); overflow: hidden; cursor: default; box-shadow: 8px 8px 0 var(--zt-shadow-color); animation: pop 0.3s cubic-bezier(0.2, 1.6, 0.4, 1); }
.frame img { display: block; width: 100%; max-height: 75vh; object-fit: contain; background: #111; }
@keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: none; opacity: 1; } }
.zt-fade-enter-active, .zt-fade-leave-active { transition: opacity 0.2s; }
.zt-fade-enter-from, .zt-fade-leave-to { opacity: 0; }
</style>
