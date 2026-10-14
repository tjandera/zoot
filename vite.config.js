import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Mounts the Vercel functions in /api on the Vite dev server so `npm run dev`
 * behaves like production (Groq key stays server-side in both).
 */
function devApi() {
  return {
    name: 'zoot-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const name = req.url.slice(5).split('?')[0].replace(/[^a-z0-9-]/gi, '')
        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`)
        } catch {
          res.statusCode = 404
          return res.end(JSON.stringify({ error: 'not found' }))
        }
        let raw = ''
        for await (const chunk of req) raw += chunk
        try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res }
        try {
          await mod.default(req, res)
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err?.message || err) }))
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  // Expose non-VITE_ keys (Groq, OneMap) to the dev API handlers only.
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['GROQ_API_KEY', 'GROQ_MODEL', 'ONEMAP_TOKEN', 'ONEMAP_EMAIL', 'ONEMAP_PASSWORD']) if (env[k] && !process.env[k]) process.env[k] = env[k]

  return {
    plugins: [vue(), devApi()],
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
