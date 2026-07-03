import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedView from './FeedView'

describe('FeedView', () => {
  it('shows empty state when feed is empty', () => {
    render(<FeedView feed={[]} works={{}} onOpenWork={() => {}} onToggleLike={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/Aucune réaction/)).toBeInTheDocument()
  })

  it('renders a feed entry and calls onDelete when clicked', async () => {
    const onDelete = vi.fn()
    const feed = [{ id: 'f1', workId: 'w1', text: 'Super épisode !', ts: Date.now(), likes: 3, liked: false, sNum: 1, eNum: 2, key: 'w1-1-2' }]
    const works = { w1: { id: 'w1', title: 'Severance', category: 'series' } }
    render(<FeedView feed={feed} works={works} onOpenWork={() => {}} onToggleLike={() => {}} onDelete={onDelete} />)
    expect(screen.getByText('Super épisode !')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Supprimer'))
    expect(onDelete).toHaveBeenCalledWith('f1')
  })
})
