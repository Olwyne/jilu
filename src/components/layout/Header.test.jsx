import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'

describe('Header', () => {
  it('renders the title and subtitle', () => {
    render(
      <Header
        title="Ma bibliothèque"
        subtitle="12 œuvres suivies"
        showBack={false}
        onBack={() => {}}
        onOpenSearch={() => {}}
        onOpenAccount={() => {}}
        isMobile={false}
        avatarInitials="AM"
      />
    )
    expect(screen.getByText('Ma bibliothèque')).toBeTruthy()
    expect(screen.getByText('12 œuvres suivies')).toBeTruthy()
  })

  it('does not render the back link when showBack is false', () => {
    render(
      <Header
        title="Ma bibliothèque"
        subtitle=""
        showBack={false}
        onBack={() => {}}
        onOpenSearch={() => {}}
        onOpenAccount={() => {}}
        isMobile={false}
        avatarInitials="AM"
      />
    )
    expect(screen.queryByText('‹ Back')).toBeNull()
  })

  it('renders the back link and calls onBack when showBack is true', async () => {
    const onBack = vi.fn()
    render(
      <Header
        title="Détail"
        subtitle=""
        showBack={true}
        onBack={onBack}
        onOpenSearch={() => {}}
        onOpenAccount={() => {}}
        isMobile={false}
        avatarInitials="AM"
      />
    )
    await userEvent.click(screen.getByText('‹ Back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('calls onOpenAccount when the avatar is clicked', async () => {
    const onOpenAccount = vi.fn()
    render(
      <Header
        title="Ma bibliothèque"
        subtitle=""
        showBack={false}
        onBack={() => {}}
        onOpenSearch={() => {}}
        onOpenAccount={onOpenAccount}
        isMobile={false}
        avatarInitials="AM"
      />
    )
    await userEvent.click(screen.getByText('AM'))
    expect(onOpenAccount).toHaveBeenCalled()
  })
})
