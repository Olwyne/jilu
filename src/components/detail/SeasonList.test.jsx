import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SeasonList from './SeasonList'

const now = Date.now()

const work = {
  id: 'w1',
  category: 'series',
  seasons: [
    {
      n: 1,
      episodes: [
        { n: 1, title: 'Good News', air: now - 1000 },
        { n: 2, title: 'Half Loop', air: now + 1000 * 60 * 60 * 24 * 30 }
      ]
    }
  ]
}

describe('SeasonList', () => {
  it('renders episode rows', () => {
    render(<SeasonList work={work} watched={{}} onToggleEpisode={() => {}} onMarkSeason={() => {}} onOpenEpisode={() => {}} />)
    expect(screen.getByText(/Good News/)).toBeInTheDocument()
    expect(screen.getByText(/Half Loop/)).toBeInTheDocument()
  })

  it('clicking the checkbox on an aired episode calls onToggleEpisode(workId, sNum, eNum)', async () => {
    const onToggleEpisode = vi.fn()
    const { container } = render(<SeasonList work={work} watched={{}} onToggleEpisode={onToggleEpisode} onMarkSeason={() => {}} onOpenEpisode={() => {}} />)
    const label = screen.getByText(/Good News/)
    const row = label.closest('div').parentElement
    const checkbox = row.firstChild
    await userEvent.click(checkbox)
    expect(onToggleEpisode).toHaveBeenCalledWith('w1', 1, 1)
  })

  it('clicking the checkbox on a not-yet-aired episode does not call onToggleEpisode', async () => {
    const onToggleEpisode = vi.fn()
    render(<SeasonList work={work} watched={{}} onToggleEpisode={onToggleEpisode} onMarkSeason={() => {}} onOpenEpisode={() => {}} />)
    const label = screen.getByText(/Half Loop/)
    const row = label.closest('div').parentElement
    const checkbox = row.firstChild
    await userEvent.click(checkbox)
    expect(onToggleEpisode).not.toHaveBeenCalled()
  })
})
