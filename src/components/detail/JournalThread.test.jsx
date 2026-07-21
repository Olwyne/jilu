import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JournalThread from './JournalThread'

const feed = [
  { id: 'c1', key: 'w:w1', text: 'Great episode', ts: Date.now() - 1000, likes: 2, liked: false },
  { id: 'c2', key: 'w:w2', text: 'Different work', ts: Date.now() - 500, likes: 0, liked: false }
]

describe('JournalThread', () => {
  it('only shows comments whose key matches commentsKey', () => {
    render(<JournalThread commentsKey="w:w1" feed={feed} onPost={() => {}} onToggleLike={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Great episode')).toBeInTheDocument()
    expect(screen.queryByText('Different work')).not.toBeInTheDocument()
  })

  it('typing in the input and clicking Publier calls onPost(text) and clears the input', async () => {
    const onPost = vi.fn()
    render(<JournalThread commentsKey="w:w1" feed={[]} onPost={onPost} onToggleLike={() => {}} onDelete={() => {}} />)
    const input = screen.getByPlaceholderText('Share your reaction…')
    await userEvent.type(input, 'Nice twist')
    await userEvent.click(screen.getByText('Post'))
    expect(onPost).toHaveBeenCalledWith('Nice twist')
    expect(input.value).toBe('')
  })

  it('does not call onPost when the draft is empty or whitespace', async () => {
    const onPost = vi.fn()
    render(<JournalThread commentsKey="w:w1" feed={[]} onPost={onPost} onToggleLike={() => {}} onDelete={() => {}} />)
    await userEvent.click(screen.getByText('Post'))
    expect(onPost).not.toHaveBeenCalled()
  })

  it('clicking the like control calls onToggleLike(commentId)', async () => {
    const onToggleLike = vi.fn()
    render(<JournalThread commentsKey="w:w1" feed={feed} onPost={() => {}} onToggleLike={onToggleLike} onDelete={() => {}} />)
    await userEvent.click(screen.getByText(/♥/))
    expect(onToggleLike).toHaveBeenCalledWith('c1')
  })

  it('clicking Supprimer calls onDelete(commentId)', async () => {
    const onDelete = vi.fn()
    render(<JournalThread commentsKey="w:w1" feed={feed} onPost={() => {}} onToggleLike={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })
})
