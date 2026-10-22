import { describe, it, expect } from 'vitest'
import { nextAiredUnwatched, nextUpList } from './nextUp'

const now = 1_000_000
const work = (id, status = 'en_cours') => ({
  id, status,
  seasons: [{ n: 1, episodes: [{ n: 1, air: 100 }, { n: 2, air: 200 }, { n: 3, air: now + 500 }] }],
})

describe('nextAiredUnwatched', () => {
  it('returns the first aired episode that is not watched, with the count left', () => {
    const w = work('a')
    expect(nextAiredUnwatched(w, {}, now)).toMatchObject({ s: { n: 1 }, e: { n: 1 }, remaining: 2 })
    expect(nextAiredUnwatched(w, { 'a-1-1': 1 }, now)).toMatchObject({ e: { n: 2 }, remaining: 1 })
  })
  it('ignores unaired episodes and returns null when caught up', () => {
    expect(nextAiredUnwatched(work('a'), { 'a-1-1': 1, 'a-1-2': 1 }, now)).toBeNull()
  })
})

describe('nextUpList', () => {
  it('keeps only titles in progress with something to watch, most recently watched first', () => {
    const works = { a: work('a'), b: work('b'), c: work('c', 'termine'), d: work('d') }
    const watched = { 'a-1-1': 10, 'b-1-1': 50 }
    const list = nextUpList(works, watched, now, 5)
    expect(list.map((x) => x.w.id)).toEqual(['b', 'a', 'd'])
  })
  it('respects the limit', () => {
    const works = { a: work('a'), b: work('b'), d: work('d') }
    expect(nextUpList(works, {}, now, 2)).toHaveLength(2)
  })
})
