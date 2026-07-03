import { describe, it, expect } from 'vitest'
import { hash, initials, fmtDate, relText, term, CAT, STATUS, DAY } from './domain'

describe('domain helpers', () => {
  it('hash is deterministic and non-negative', () => {
    expect(hash('one-piece')).toBe(hash('one-piece'))
    expect(hash('one-piece')).toBeGreaterThanOrEqual(0)
  })

  it('initials takes first letters of first two words', () => {
    expect(initials('The Bear')).toBe('TB')
  })

  it('initials takes first two chars of a single word', () => {
    expect(initials('Frieren')).toBe('FR')
  })

  it('initials strips trailing colon/dash suffix', () => {
    expect(initials('Dune: Deuxième partie')).toBe('DU')
  })

  it('fmtDate renders French day + abbreviated month', () => {
    const ts = new Date(2026, 0, 15).getTime() // 15 janv. 2026
    expect(fmtDate(ts)).toBe('15 janv.')
  })

  it('relText handles today/tomorrow/near future/past/far future', () => {
    const now = Date.now()
    expect(relText(now, now)).toBe("aujourd'hui")
    expect(relText(now + DAY, now)).toBe('demain')
    expect(relText(now + 3 * DAY, now)).toBe('dans 3 j')
    expect(relText(now - 3 * DAY, now)).toBe('il y a 3 j')
    expect(relText(now - 20 * DAY, now)).toBe('il y a 3 sem')
  })

  it('term returns series terminology by default and music terminology for musique', () => {
    expect(term('series').unit).toBe('épisodes')
    expect(term('musique').unit).toBe('titres')
  })

  it('CAT and STATUS expose French labels', () => {
    expect(CAT.animes).toBe('Animés')
    expect(STATUS.en_cours.label).toBe('En cours')
  })
})
