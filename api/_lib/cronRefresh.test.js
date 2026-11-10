import { describe, it, expect, vi } from 'vitest'
import { createCronHandler, CRON_MIN_AGE_MS } from './cronRefresh.js'

vi.mock('./refreshCatalog.js', () => ({ refreshCatalogWork: vi.fn() }))
import { refreshCatalogWork } from './refreshCatalog.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = 100 * DAY
const mockRes = () => {
  const res = {}
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}
const run = async ({ secret = 's', auth = 'Bearer s', airing = [], now = () => NOW, budgetMs, concurrency } = {}) => {
  const store = { listAiring: vi.fn(async () => airing) }
  const res = mockRes()
  await createCronHandler({ store, fetchFresh: vi.fn(), secret, now, budgetMs, concurrency })({ headers: { authorization: auth } }, res)
  return { res, store }
}

describe('cron de rafraîchissement', () => {
  it('refuse sans le bon secret, et si aucun secret n’est configuré', async () => {
    expect((await run({ auth: 'Bearer faux' })).res.statusCode).toBe(401)
    expect((await run({ auth: null })).res.statusCode).toBe(401) // pas d'en-tête
    const { res, store } = await run({ secret: '', auth: 'Bearer ' }) // CRON_SECRET absent sur Vercel
    expect(res.statusCode).toBe(401)
    expect(store.listAiring).not.toHaveBeenCalled()
  })

  it('les plus anciennes d’abord, en sautant celles rafraîchies dans la journée ; une panne n’arrête pas les autres', async () => {
    refreshCatalogWork.mockReset()
      .mockResolvedValueOnce({ status: 'refreshed' })
      .mockRejectedValueOnce(new Error('TMDB 500'))
      .mockResolvedValueOnce({ status: 'busy' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const airing = [
      { id: 'recente', refreshedAt: NOW - CRON_MIN_AGE_MS + 1000 },
      { id: 'b', refreshedAt: NOW - 3 * DAY },
      { id: 'a', refreshedAt: NOW - 5 * DAY },
      { id: 'jamais', refreshedAt: 0 },
    ]
    const { res } = await run({ airing, concurrency: 1 })
    expect(refreshCatalogWork.mock.calls.map((c) => c[0].id)).toEqual(['jamais', 'a', 'b'])
    expect(refreshCatalogWork.mock.calls[0][0].minAgeMs).toBe(CRON_MIN_AGE_MS)
    expect(res.body).toEqual({ refreshed: 1, skipped: 1, failed: 1, due: 3, remaining: 0 })
  })

  it('s’arrête quand le budget de temps est dépassé (le reste attend le lendemain)', async () => {
    refreshCatalogWork.mockReset().mockResolvedValue({ status: 'refreshed' })
    let t = NOW
    const now = () => (t += 20_000) // chaque appel « coûte » 20 s
    const airing = ['a', 'b', 'c', 'd'].map((id) => ({ id, refreshedAt: 0 }))
    const { res } = await run({ airing, now, budgetMs: 45_000 })
    expect(res.body.refreshed).toBeLessThan(4)
    expect(res.body.remaining).toBe(4 - res.body.refreshed)
  })

  it('traite plusieurs œuvres en parallèle, jamais plus que la limite, chacune une seule fois', async () => {
    let inFlight = 0
    let peak = 0
    refreshCatalogWork.mockReset().mockImplementation(async () => {
      inFlight++; peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return { status: 'refreshed' }
    })
    const airing = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, refreshedAt: 0 }))
    const { res } = await run({ airing, concurrency: 3 })
    expect(peak).toBe(3)
    expect(new Set(refreshCatalogWork.mock.calls.map((c) => c[0].id)).size).toBe(10)
    expect(res.body).toMatchObject({ refreshed: 10, remaining: 0 })
  })
})
