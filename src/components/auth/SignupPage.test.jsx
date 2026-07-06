import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from './SignupPage'

const signup = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ signup }) }))

describe('SignupPage', () => {
  it('submits email and password to signup()', async () => {
    render(<SignupPage onSwitchToLogin={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Adresse e-mail'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('Mot de passe'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(signup).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
