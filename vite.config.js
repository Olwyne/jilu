import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function tmdbProxyPlugin(env) {
  return {
    name: 'tmdb-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tmdb', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const path = url.searchParams.get('path')
        url.searchParams.delete('path')
        url.searchParams.set('api_key', env.TMDB_API_KEY)
        try {
          const upstream = await fetch(`https://api.themoviedb.org/3${path}?${url.searchParams}`)
          const json = await upstream.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(json))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

function rawgProxyPlugin(env) {
  return {
    name: 'rawg-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rawg', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        url.searchParams.set('key', env.RAWG_API_KEY)
        try {
          const upstream = await fetch(`https://api.rawg.io/api/games?${url.searchParams}`)
          const json = await upstream.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(json))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

function booksProxyPlugin(env) {
  return {
    name: 'books-proxy',
    configureServer(server) {
      server.middlewares.use('/api/books', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        url.searchParams.set('key', env.GOOGLE_BOOKS_API_KEY)
        try {
          const upstream = await fetch(`https://www.googleapis.com/books/v1/volumes?${url.searchParams}`)
          const json = await upstream.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(json))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

function spotifyTokenPlugin(env) {
  return {
    name: 'spotify-token',
    configureServer(server) {
      server.middlewares.use('/api/spotify-token', async (req, res) => {
        const id = env.SPOTIFY_CLIENT_ID
        const secret = env.SPOTIFY_CLIENT_SECRET
        const basic = Buffer.from(`${id}:${secret}`).toString('base64')
        try {
          const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
          })
          const json = await tokenRes.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ access_token: json.access_token }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    react(),
    tmdbProxyPlugin(env),
    rawgProxyPlugin(env),
    booksProxyPlugin(env),
    spotifyTokenPlugin(env),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
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
            urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'tmdb-api', networkTimeoutSeconds: 5 },
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
        theme_color: '#6f50ff',
        background_color: '#0f0f13',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    allowedHosts: ['jilu.localhost', 'localhost'],
    proxy: {
      '/anilist-proxy': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anilist-proxy/, '')
      },
      '/mangadex-proxy': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mangadex-proxy/, '')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js'
  }
  }
})
