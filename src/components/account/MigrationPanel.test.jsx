import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MigrationPanel, { MIGRATION_OWNER_UID } from './MigrationPanel'
import { migrateAccount } from '../../lib/migration'

let mockUser = { uid: MIGRATION_OWNER_UID }
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }))
vi.mock('../../firebase', () => ({ db: {} }))
vi.mock('../../lib/migration', () => ({ migrateAccount: vi.fn() }))

beforeEach(() => { vi.clearAllMocks(); mockUser = { uid: MIGRATION_OWNER_UID } })

describe('MigrationPanel', () => {
  it('est invisible pour les autres comptes', () => {
    mockUser = { uid: 'quelquun-d-autre' }
    const { container } = render(<MigrationPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lance la migration de son propre compte et affiche le contrôle', async () => {
    migrateAccount.mockResolvedValue({
      report: { works: 3, episodesWatched: 5, catalog: 3, localWorks: 1, orphanProgress: 0, unassignedRatings: [] },
      written: { libraryWritten: 3, catalogWritten: 3 },
      verification: { ok: true, missing: [], mismatched: [] },
    })
    render(<MigrationPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Migrer mon compte' }))
    await waitFor(() => expect(screen.getByText(/Contrôle OK/)).toBeInTheDocument())
    expect(migrateAccount).toHaveBeenCalledWith({}, MIGRATION_OWNER_UID, expect.objectContaining({ onBackup: expect.any(Function) }))
  })

  it('signale un contrôle en échec', async () => {
    migrateAccount.mockResolvedValue({
      report: { works: 1, episodesWatched: 0, catalog: 1, localWorks: 0, orphanProgress: 0, unassignedRatings: [] },
      written: { libraryWritten: 0, catalogWritten: 0 },
      verification: { ok: false, missing: ['w1'], mismatched: [] },
    })
    render(<MigrationPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Migrer mon compte' }))
    await waitFor(() => expect(screen.getByText(/1 manquant/)).toBeInTheDocument())
  })

  it('affiche l’erreur sans planter', async () => {
    migrateAccount.mockRejectedValue(new Error('permission-denied'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MigrationPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Migrer mon compte' }))
    await waitFor(() => expect(screen.getByText(/permission-denied/)).toBeInTheDocument())
  })
})
