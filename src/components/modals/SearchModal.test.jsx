import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchModal from './SearchModal'
import * as searchModule from '../../catalog/search'

describe('SearchModal', () => {
  it('debounces input and shows results from searchCatalog', async () => {
    vi.spyOn(searchModule, 'searchCatalog').mockResolvedValue([{ id: 'tmdb-tv-1', title: 'Shōgun', category: 'series', year: 2024 }])
    render(<SearchModal works={{}} onAdd={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Ajouter une série, un film, un animé…'), 'shogun')
    await waitFor(() => expect(screen.getByText('Shōgun')).toBeInTheDocument(), { timeout: 1000 })
  })

  it('clicking "+ Ajouter" calls onAdd with the result', async () => {
    vi.spyOn(searchModule, 'searchCatalog').mockResolvedValue([{ id: 'tmdb-tv-1', title: 'Shōgun', category: 'series', year: 2024 }])
    const onAdd = vi.fn()
    render(<SearchModal works={{}} onAdd={onAdd} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Ajouter une série, un film, un animé…'), 'shogun')
    await waitFor(() => screen.getByText('+ Ajouter'))
    await userEvent.click(screen.getByText('+ Ajouter'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'tmdb-tv-1' }))
  })
})
