import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'

const login = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

describe('LoginPage', () => {
  it('submits email and password to login()', async () => {
    render(<LoginPage onSwitchToSignup={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Adresse e-mail'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('Mot de passe'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(login).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
