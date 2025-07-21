import { render, screen } from '@testing-library/react'
import { PageTitle } from './PageTitle'

describe('PageTitle', () => {
  it('should replace Typography with heading classes', () => {
    render(<PageTitle>Test Title</PageTitle>)
    
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveTextContent('Test Title')
    expect(heading).toHaveClass('text-2xl')
    expect(heading.tagName).toBe('H4')
  })
})