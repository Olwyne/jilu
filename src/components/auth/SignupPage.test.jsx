import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from './SignupPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null })
}))

const signup = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ signup }) }))

describe('SignupPage', () => {
  it('submits email and password to signup()', async () => {
    render(<SignupPage onSwitchToLogin={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(signup).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
