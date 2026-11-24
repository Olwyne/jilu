import { describe, it, expect, vi } from 'vitest'
import { createEnsureHandler, ENSURE_MAX_IDS } from './ensureCatalog.js'

function call(handler, { method = 'POST', auth = 'Bearer tok', body } = {}) {
  const out = { status: 0, body: null }
  const res = { setHeader() {}, status(c) { out.status = c; return this }, json(b) { out.body = b; return this } }
  return handler({ method, headers: { authorization: auth }, body }, res).then(() => out)
}
function setup({ existing = {}, works = {} } = {}) {
  const docs = new Map(Object.entries(existing))
  const store = {
    get: async (id) => docs.get(id) ?? null,
    consumeQuota: vi.fn(async () => true),
    create: vi.fn(async (id, d) => { if (docs.has(id)) return false; docs.set(id, d); return true }),
  }
  const fetchWork = vi.fn(async (id) => works[id] ?? null)
  const handler = createEnsureHandler({ verifyToken: async (t) => (t === 'tok' ? 'u1' : null), store, fetchWork, now: () => 1000 })
  return { handler, store, fetchWork, docs }
}

describe('POST /api/catalog-ensure', () => {
  it('exige un utilisateur connecté et une liste d’identifiants valide (20 maximum)', async () => {
    const { handler, fetchWork } = setup()
    expect((await call(handler, { method: 'GET' })).status).toBe(405)
    expect((await call(handler, { auth: 'Bearer faux', body: { ids: ['tmdb-tv-1'] } })).status).toBe(401)
    for (const body of [{}, { ids: [] }, { ids: 'tmdb-tv-1' }, { ids: [1] }, { ids: Array(ENSURE_MAX_IDS + 1).fill('tmdb-tv-1') }]) {
      expect((await call(handler, { body })).status).toBe(400)
    }
    expect(fetchWork).not.toHaveBeenCalled()
  })
  it('crée les fiches manquantes depuis la source ; ne touche pas aux existantes ; aucun contenu client', async () => {
    const { handler, docs, fetchWork, store } = setup({
      existing: { 'tmdb-tv-2': { title: 'Déjà là' } },
      works: { 'tmdb-tv-1': { id: 'tmdb-tv-1', source: 'tmdb', title: 'Vraie série', overview: undefined } },
    })
    const out = await call(handler, { body: JSON.stringify({ ids: ['tmdb-tv-1', 'tmdb-tv-2', 'tmdb-tv-3', 'rawg-9', 'tmdb-tv-1'], title: 'Piratée' }) })
    expect(out.status).toBe(200)
    expect(out.body.results).toEqual({ 'tmdb-tv-1': 'created', 'tmdb-tv-2': 'exists', 'tmdb-tv-3': 'not_found', 'rawg-9': 'unsupported' })
    expect(docs.get('tmdb-tv-1')).toEqual({ id: 'tmdb-tv-1', source: 'tmdb', title: 'Vraie série', refreshedAt: 1000, updatedAt: 1000 })
    expect(docs.get('tmdb-tv-2')).toEqual({ title: 'Déjà là' })
    expect(fetchWork).toHaveBeenCalledTimes(2) // ni l'existante, ni l'identifiant non pris en charge, ni le doublon
    expect(store.create).toHaveBeenCalledTimes(1)
  })
  it('plafond quotidien atteint : 429, aucune source appelée', async () => {
    const { handler, store, fetchWork } = setup({ works: { 'igdb-2': { title: 'Jeu' } } })
    store.consumeQuota.mockResolvedValue(false)
    expect((await call(handler, { body: { ids: ['igdb-2', 'igdb-3'] } })).status).toBe(429)
    expect(store.consumeQuota).toHaveBeenCalledWith('u1', 'ensure', 2, 2000, 1000)
    expect(fetchWork).not.toHaveBeenCalled()
  })
  it('une panne d’une source n’empêche pas les autres', async () => {
    const { handler, fetchWork } = setup({ works: { 'igdb-2': { title: 'Jeu' } } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchWork.mockImplementationOnce(async () => { throw new Error('TMDB 500') })
    const out = await call(handler, { body: { ids: ['tmdb-tv-1', 'igdb-2'] } })
    expect(out.body.results).toEqual({ 'tmdb-tv-1': 'failed', 'igdb-2': 'created' })
  })
})
