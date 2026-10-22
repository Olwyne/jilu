import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from './Card'

describe('Card', () => {
  it('renders children in the requested element and forwards layout props', () => {
    render(<Card as="section" pad="md" data-testid="c" style={{ marginBottom: 12 }}>Body</Card>)
    const el = screen.getByTestId('c')
    expect(el.tagName).toBe('SECTION')
    expect(el).toHaveTextContent('Body')
    expect(el).toHaveStyle({ marginBottom: '12px' })
  })
})
