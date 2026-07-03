import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccountView from './AccountView'

const profile = { name: 'Alice', handle: '@alice', email: 'alice@example.com', memberSince: 'Juillet 2024' }
const settings = { notifNewEp: true, notifCalendar: false, notifWeekly: false, autoNext: false, spoilerFree: false, adult: false, publicProfile: false, startPage: 'dashboard' }

describe('AccountView', () => {
  it('calls onToggleSetting when a switch is clicked', async () => {
    const onToggleSetting = vi.fn()
    render(<AccountView profile={profile} settings={settings} onToggleSetting={onToggleSetting} onEditField={() => {}} onMarkAll={() => {}} onReset={() => {}} onLogout={() => {}} />)
    await userEvent.click(screen.getByText('Nouveaux épisodes').parentElement.nextElementSibling)
    expect(onToggleSetting).toHaveBeenCalledWith('notifNewEp')
  })

  it('calls onReset only when window.confirm returns true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<AccountView profile={profile} settings={settings} onToggleSetting={() => {}} onEditField={() => {}} onMarkAll={() => {}} onReset={onReset} onLogout={() => {}} />)
    await userEvent.click(screen.getByText('Réinitialiser la progression'))
    expect(onReset).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
