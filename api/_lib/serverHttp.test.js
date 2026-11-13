import { describe, it, expect, vi } from 'vitest'
import { createServerHttp } from './serverHttp.js'

describe('createServerHttp', () => {
  it('sert /api/<nom> avec la fonction api/ correspondante (paramètres répétés conservés)', async () => {
    const tmdb = vi.fn(async (req, res) => res.status(200).json({ ok: req.query }))
    const http = createServerHttp({ handlers: { tmdb } })
    const r = await http('/api/tmdb?path=%2Ftv%2F1&ids%5B%5D=a&ids%5B%5D=b')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: { path: '/tv/1', 'ids[]': ['a', 'b'] } })
    expect(tmdb.mock.calls[0][0].method).toBe('GET')
  })
  it('transmet le statut d’erreur de la fonction', async () => {
    const igdb = async (req, res) => res.status(400).json({ error: 'invalid op' })
    const r = await createServerHttp({ handlers: { igdb } })('/api/igdb?op=x')
    expect(r.status).toBe(400)
    expect(r.ok).toBe(false)
  })
  it('laisse passer les adresses absolues et refuse les adresses internes inconnues', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    const http = createServerHttp({ handlers: {}, fetchImpl })
    await http('https://graphql.anilist.co', { method: 'POST' })
    expect(fetchImpl).toHaveBeenCalledWith('https://graphql.anilist.co', { method: 'POST' })
    await expect(http('/api/rawg?x=1')).rejects.toThrow('non prise en charge')
    await expect(http('/autre')).rejects.toThrow('non prise en charge')
  })
})
