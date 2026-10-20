import { describe, it, expect, vi } from 'vitest'
import { createServerHttp } from './serverHttp.js'

const env = { TMDB_API_KEY: 'KEY', SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' }
const ok = (body) => ({ ok: true, status: 200, json: async () => body })

describe('createServerHttp', () => {
  it('traduit /api/tmdb vers l’API TMDB avec la clé serveur', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await createServerHttp({ env, fetchImpl })('/api/tmdb?path=%2Ftv%2F1%2Fseason%2F2&language=fr-FR')
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.themoviedb.org/3/tv/1/season/2')
    expect(url.searchParams.get('api_key')).toBe('KEY')
    expect(url.searchParams.get('language')).toBe('fr-FR')
    expect(url.searchParams.has('path')).toBe(false)
  })
  it('traduit /api/mangadex en conservant les paramètres répétés', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await createServerHttp({ env, fetchImpl })('/api/mangadex?path=%2Fchapter&ids%5B%5D=a&ids%5B%5D=b&limit=100')
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.mangadex.org/chapter')
    expect(url.searchParams.getAll('ids[]')).toEqual(['a', 'b'])
    expect(fetchImpl.mock.calls[0][1].headers['User-Agent']).toBe('jilu-app')
  })
  it('fournit un jeton Spotify mis en cache', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ access_token: 'T', expires_in: 3600 }))
    const http = createServerHttp({ env, fetchImpl })
    expect(await (await http('/api/spotify-token')).json()).toEqual({ access_token: 'T' })
    await http('/api/spotify-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Basic ' + Buffer.from('id:secret').toString('base64'))
  })
  it('laisse passer les adresses absolues et refuse les adresses internes inconnues', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    const http = createServerHttp({ env, fetchImpl })
    await http('https://graphql.anilist.co', { method: 'POST' })
    expect(fetchImpl).toHaveBeenCalledWith('https://graphql.anilist.co', { method: 'POST' })
    await expect(http('/api/rawg?x=1')).rejects.toThrow('non prise en charge')
  })
})
