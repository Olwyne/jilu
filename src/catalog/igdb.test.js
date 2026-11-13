import { describe, it, expect, vi, beforeEach } from 'vitest'
import { igdbSearch, igdbTimeToBeat, igdbGetWork } from './igdb'

const respond = (body, ok = true) => { global.fetch = vi.fn().mockResolvedValue({ ok, json: async () => body }) }
beforeEach(() => vi.restoreAllMocks())

describe('igdb (client)', () => {
  it('transforme un résultat IGDB en œuvre (affiche, année, genre)', async () => {
    respond([{ id: 119133, name: 'Elden Ring', first_release_date: 1645747200, cover: { image_id: 'co4jni' }, genres: [{ name: 'Role-playing (RPG)' }], summary: 'S' }])
    const [w] = await igdbSearch('elden')
    expect(global.fetch).toHaveBeenCalledWith('/api/igdb?op=search&q=elden')
    expect(w).toEqual({
      source: 'igdb', sourceId: 119133, id: 'igdb-119133', title: 'Elden Ring', category: 'jeux',
      genre: 'Role-playing (RPG)', year: 2022, overview: 'S', seasons: null, release: 1645747200000,
      poster: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
    })
  })
  it('une panne du serveur donne une liste vide, pas une erreur', async () => {
    respond({ error: 'upstream error' }, false)
    expect(await igdbSearch('x')).toEqual([])
  })
  it('durées de jeu : secondes -> heures arrondies, null si IGDB ne sait pas', async () => {
    respond([{ game_id: 1, hastily: 180000, normally: 252000, completely: 486000 }])
    expect(await igdbTimeToBeat(1)).toEqual({ main: 50, extra: 70, full: 135 })
    respond([])
    expect(await igdbTimeToBeat(2)).toBeNull()
  })
  it('fiche complète d’un jeu, avec ses durées si IGDB les connaît', async () => {
    global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => (String(url).includes('op=game')
      ? [{ id: 1942, name: 'The Witcher 3', first_release_date: 1431993600, cover: { image_id: 'c' }, genres: [{ name: 'RPG' }] }]
      : [{ game_id: 1942, normally: 36000 }]) }))
    expect(await igdbGetWork(1942)).toMatchObject({ id: 'igdb-1942', title: 'The Witcher 3', year: 2015, timeToBeat: { main: null, extra: 10, full: null } })
    expect(global.fetch.mock.calls[0][0]).toBe('/api/igdb?op=game&id=1942')
    respond([])
    expect(await igdbGetWork(2)).toBeNull()
  })
})
