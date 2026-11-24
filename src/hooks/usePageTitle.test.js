import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageTitle } from './usePageTitle'

describe('usePageTitle', () => {
  it('un titre par page, et « Jilu » seul quand la page n’a pas de nom', () => {
    const { rerender } = renderHook(({ page }) => usePageTitle(page), { initialProps: { page: 'Bibliothèque' } })
    expect(document.title).toBe('Bibliothèque · Jilu')
    rerender({ page: undefined })
    expect(document.title).toBe('Jilu')
  })
})
