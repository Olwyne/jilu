import { describe, it, expect, vi } from 'vitest'
import { createHandler } from './refreshHandler.js'

function call(handler, { method = 'POST', headers = { authorization: 'Bearer tok' }, body = { id: 'tmdb-tv-1' } } = {}) {
  const out = { status: 0, body: null, headers: {} }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(c) { out.status = c; return this }, json(b) { out.body = b; return this } }
  return handler({ method, headers, body }, res).then(() => out)
}

const doc = { id: 'tmdb-tv-1', source: 'tmdb', sourceId: 1, title: 'S', category: 'series', seasons: [{ n: 1, episodes: [{ n: 1 }] }], refreshedAt: 0 }
function setup(over = {}) {
  const docs = new Map([['tmdb-tv-1', doc]])
  const store = {
    get: async (id) => docs.get(id) ?? null,
    acquireLease: async (id) => ({ ok: true, doc: docs.get(id) }),
    save: async (id, d) => { docs.set(id, d) },
    releaseLease: vi.fn(async () => {}),
  }
  const deps = { verifyToken: vi.fn(async () => 'u1'), store, fetchFresh: vi.fn(async (w) => ({ ...w, title: 'S2' })), now: () => 1e12, ...over }
  return { handler: createHandler(deps), deps, docs }
}

describe('POST /api/refresh-work', () => {
  it('refuse les autres méthodes', async () => {
    const { handler } = setup()
    const r = await call(handler, { method: 'GET' })
    expect(r.status).toBe(405)
    expect(r.headers.Allow).toBe('POST')
  })
  it('exige un jeton Firebase valide', async () => {
    const { handler, deps } = setup()
    expect((await call(handler, { headers: {} })).status).toBe(401)
    deps.verifyToken.mockRejectedValue(new Error('expired'))
    expect((await call(handler)).status).toBe(401)
    expect(deps.fetchFresh).not.toHaveBeenCalled()
  })
  it('valide l’identifiant', async () => {
    const { handler } = setup()
    for (const id of [undefined, '', 5, 'a/b', 'local-u1-x', 'x'.repeat(201)]) {
      expect((await call(handler, { body: { id } })).status).toBe(400)
    }
  })
  it('rafraîchit et renvoie 200 (corps JSON ou texte)', async () => {
    const { handler, docs } = setup()
    expect((await call(handler)).status).toBe(200)
    expect(docs.get('tmdb-tv-1').title).toBe('S2')
    expect((await call(handler, { body: JSON.stringify({ id: 'tmdb-tv-1' }) })).status).toBe(200)
  })
  it('traduit les statuts : 404 inconnue, 502 en cas d’échec amont', async () => {
    const { handler, deps } = setup()
    expect((await call(handler, { body: { id: 'inconnue' } })).status).toBe(404)
    deps.fetchFresh.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await call(handler)
    expect(r.status).toBe(502)
    expect(r.body).toEqual({ error: 'upstream error' })
  })
})
