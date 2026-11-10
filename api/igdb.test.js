import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler, { OPS } from './igdb.js'

const mockRes = () => {
  const res = { headers: {}, statusCode: 200 }
  res.setHeader = (k, v) => { res.headers[k] = v }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'cid'
  process.env.TWITCH_CLIENT_SECRET = 'sec'
})

describe('api/igdb', () => {
  it('le texte de recherche ne peut pas sortir de sa chaîne (guillemets et ; neutralisés)', () => {
    const [endpoint, body] = OPS.search({ q: 'zelda"; fields *; where id = 1; limit 500; "' })
    expect(endpoint).toBe('games')
    expect(body).toMatch(/^search "zelda; fields \*; where id = 1; limit 500; "; fields /)
    expect(body.match(/"/g)).toHaveLength(2) // une seule chaîne, celle de la recherche
    expect(body).toContain('limit 10;')
  })
  it('durées de jeu : identifiant numérique uniquement', () => {
    expect(OPS.ttb({ id: '42' })[1]).toContain('where game_id = 42;')
    expect(OPS.ttb({ id: '42; fields *' })).toBe(false)
  })
  it('refuse une opération inconnue ou incomplète, sans appeler Twitch', async () => {
    global.fetch = vi.fn()
    for (const query of [{ op: 'games' }, { op: 'search' }, {}]) {
      const res = mockRes()
      await handler({ method: 'GET', query }, res)
      expect(res.statusCode).toBe(400)
    }
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('jeton Twitch puis requête IGDB, réponse mise en cache par le CDN', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: 1 }] })
    const res = mockRes()
    await handler({ method: 'GET', query: { op: 'trending' } }, res)
    expect(global.fetch.mock.calls[0][0]).toContain('https://id.twitch.tv/oauth2/token?client_id=cid')
    const [url, init] = global.fetch.mock.calls[1]
    expect(url).toBe('https://api.igdb.com/v4/games')
    expect(init.headers).toMatchObject({ 'Client-ID': 'cid', Authorization: 'Bearer tok' })
    expect(res.body).toEqual([{ id: 1 }])
    expect(res.headers['Cache-Control']).toContain('s-maxage')
  })
})
