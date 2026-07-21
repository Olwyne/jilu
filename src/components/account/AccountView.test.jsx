import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccountView from './AccountView'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }))
vi.mock('../../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ data: () => ({}) }),
  setDoc: vi.fn().mockResolvedValue()
}))

const profile = { name: 'Alice', handle: '@alice', email: 'alice@example.com', memberSince: 'Juillet 2024' }
const settings = { notifNewEp: true, notifCalendar: false, notifWeekly: false, autoNext: false, spoilerFree: false, adult: false, publicProfile: false }

describe('AccountView', () => {
  it('calls onToggleSetting when the publicProfile switch is clicked', async () => {
    const onToggleSetting = vi.fn()
    render(<AccountView profile={profile} settings={settings} onToggleSetting={onToggleSetting} onMarkAll={() => {}} onReset={() => {}} onLogout={() => {}} />)
    await userEvent.click(screen.getByText('Public profile').parentElement.nextElementSibling.firstElementChild)
    expect(onToggleSetting).toHaveBeenCalledWith('publicProfile')
  })

  it('calls onReset only when window.confirm returns true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<AccountView profile={profile} settings={settings} onToggleSetting={() => {}} onMarkAll={() => {}} onReset={onReset} onLogout={() => {}} />)
    await userEvent.click(screen.getByText('Reset progress'))
    expect(onReset).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('calls onLogout when the logout button is clicked', async () => {
    const onLogout = vi.fn()
    render(<AccountView profile={profile} settings={settings} onToggleSetting={() => {}} onMarkAll={() => {}} onReset={() => {}} onLogout={onLogout} />)
    await userEvent.click(screen.getByText('Log out'))
    expect(onLogout).toHaveBeenCalled()
  })
})
