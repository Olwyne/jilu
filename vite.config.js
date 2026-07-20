import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react(), spotifyTokenPlugin(env)],
  server: {
    allowedHosts: ['jilu.localhost'],
    proxy: {
      '/anilist-proxy': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anilist-proxy/, '')
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
