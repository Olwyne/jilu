import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EpisodeModal from './EpisodeModal'

const work = { id: 'w1', title: 'Severance', category: 'series', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Good News', air: 0 }] }] }

describe('EpisodeModal', () => {
  it('renders the episode label and a close button', async () => {
    const onClose = vi.fn()
    render(<EpisodeModal work={work} sNum={1} eNum={1} ratings={{}} feed={[]} actions={{}} onClose={onClose} />)
    expect(screen.getByText(/Episode 1/)).toBeInTheDocument()
    await userEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking a star calls actions.setRating with scope "e"', async () => {
    const setRating = vi.fn()
    render(<EpisodeModal work={work} sNum={1} eNum={1} ratings={{}} feed={[]} actions={{ setRating }} onClose={() => {}} />)
    const stars = screen.getAllByText('☆')
    await userEvent.click(stars[2])
    expect(setRating).toHaveBeenCalledWith('e', 'w1-1-1', 3)
  })
})
