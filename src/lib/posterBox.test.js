import { describe, it, expect } from 'vitest'
import { posterGradient } from './posterBox'

describe('posterGradient', () => {
  it('is deterministic for the same id', () => {
    expect(posterGradient('one-piece')).toEqual(posterGradient('one-piece'))
  })

  it('returns a from/to hex pair from the fixed palette', () => {
    const g = posterGradient('dune-2')
    expect(g.from).toMatch(/^#[0-9a-f]{6}$/)
    expect(g.to).toMatch(/^#[0-9a-f]{6}$/)
  })
})
