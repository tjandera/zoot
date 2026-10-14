import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
  return {
    plugins: [vue()],
    worker: { format: 'es' },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('maplibre-gl')) return 'maplibre'
            if (id.includes('node_modules/three')) return 'three'
            if (id.includes('@supabase')) return 'supabase'
          }
        }
      }
    }
  }
})
