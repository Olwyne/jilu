import { describe, it, expect } from 'vitest'
import { hash, initials, fmtDate, relText, term, CAT, STATUS, DAY, formatWatchTime } from './domain'

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

  it('relText handles today/tomorrow/near future/past/far future in French', () => {
    const now = Date.now()
    expect(relText(now, now, 'fr')).toBe("aujourd’hui")
    expect(relText(now + DAY, now, 'fr')).toBe('demain')
    expect(relText(now + 3 * DAY, now, 'fr')).toBe('dans 3 jours')
    expect(relText(now - 3 * DAY, now, 'fr')).toBe('il y a 3 jours')
    expect(relText(now - 20 * DAY, now, 'fr')).toBe('il y a 3 semaines')
  })

  it('relText returns English relative time when lang is en', () => {
    const now = Date.now()
    expect(relText(now, now, 'en')).toBe('today')
    expect(relText(now + DAY, now, 'en')).toBe('tomorrow')
    expect(relText(now + 3 * DAY, now, 'en')).toBe('in 3 days')
  })

  it('term returns series terminology by default and music terminology for musique', () => {
    expect(term('series').unit).toBe('épisodes')
    expect(term('musique').unit).toBe('titres')
  })

  it('CAT and STATUS expose French labels', () => {
    expect(CAT.animes).toBe('Animés')
    expect(STATUS.en_cours.label).toBe('En cours')
  })

  it('formatWatchTime : exact, jamais arrondi à l\'heure', () => {
    const t = (k, { count }) => count + ' ' + k.split('.')[1]
    expect(formatWatchTime(0, t)).toBe('0 minute')
    expect(formatWatchTime(48, t)).toBe('48 minute')
    expect(formatWatchTime(125, t)).toBe('2 hour 5 minute')
    expect(formatWatchTime(1440 + 60, t)).toBe('1 day 1 hour')
  })
})
