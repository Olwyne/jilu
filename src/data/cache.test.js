import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createCache } from './cache.js'

let cache
beforeEach(async () => { cache = await createCache(`test-${Math.random()}`) })

describe('createCache (IndexedDB)', () => {
  it('stocke et relit des valeurs structurées (dont Infinity)', async () => {
    expect(cache.persistent).toBe(true)
    await cache.set('a', { n: 1, air: Infinity, eps: { '1-1': 5 } })
    expect(await cache.get('a')).toEqual({ n: 1, air: Infinity, eps: { '1-1': 5 } })
    expect(await cache.get('absent')).toBeUndefined()
  })
  it('liste, écrit et supprime par lots et par préfixe', async () => {
    await cache.setMany([['lib:u1:a', 1], ['lib:u1:b', 2], ['lib:u2:a', 3], ['cat:x', 4]])
    expect((await cache.entries('lib:u1:')).sort()).toEqual([['lib:u1:a', 1], ['lib:u1:b', 2]])
    await cache.deleteMany(['lib:u1:a'])
    expect(await cache.get('lib:u1:a')).toBeUndefined()
    await cache.clear('lib:u1:')
    expect(await cache.entries('lib:u1:')).toEqual([])
    expect(await cache.get('lib:u2:a')).toBe(3)
    expect(await cache.get('cat:x')).toBe(4)
  })
})
