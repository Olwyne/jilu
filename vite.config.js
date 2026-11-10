import { existsSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Dev : sert les fonctions Vercel de api/ telles quelles (mêmes listes blanches, même code qu'en prod).
// Adaptateur minimal vers l'API req/res de Vercel : req.query, req.body (texte brut), res.status().json().
function vercelApiPlugin() {
  return {
    name: 'vercel-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.slice(1)
        // Comme sur Vercel : seules les fonctions sont des routes (jamais _proxy, _lib ni le code source)
        const notFound = () => { res.statusCode = 404; res.end() }
        if (!/^[a-z-]+$/.test(name) || !existsSync(`api/${name}.js`)) return notFound()
        const mod = await server.ssrLoadModule(`/api/${name}.js`)
        req.query = {}
        for (const k of new Set(url.searchParams.keys())) {
          const all = url.searchParams.getAll(k)
          req.query[k] = all.length > 1 ? all : all[0]
        }
        let body = ''
        for await (const chunk of req) body += chunk
        req.body = body || undefined
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
        try { await mod.default(req, res) } catch (e) { server.ssrFixStacktrace(e); next(e) }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Clés des API (TMDB, RAWG…) de .env.local : lues par les fonctions de api/ via process.env, comme sur Vercel
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v
  return {
  plugins: [
    react(),
    vercelApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        // Les affiches sont téléchargées par le service worker : leurs hôtes doivent figurer dans connect-src (vercel.json)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/s4\.anilist\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'anilist-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/media\.rawg\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rawg-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/books\.google\.com\/books\/content.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gbooks-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/graphql\.anilist\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'anilist-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: 'Jilu',
        short_name: 'Jilu',
        description: 'Toute ta culture, suivie en un seul endroit.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    allowedHosts: ['jilu.localhost', 'localhost'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    exclude: ['**/node_modules/**', 'tests/rules/**'],
    // classes lisibles pour les CSS modules (ex. "active") dans les assertions
    css: { include: /\.module\.css$/, modules: { classNameStrategy: 'non-scoped' } }
  }
  }
})
