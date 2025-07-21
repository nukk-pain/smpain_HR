import { render, screen } from '@testing-library/react'
import { GridLayout } from './GridLayout'

describe('GridLayout', () => {
  it('should replace Grid with Tailwind CSS grid classes', () => {
    const { container } = render(
      <GridLayout>
        <div>Item 1</div>
        <div>Item 2</div>
      </GridLayout>
    )
    
    // Should find the grid container with specific classes
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer).toHaveClass('grid')
    expect(gridContainer).toHaveClass('grid-cols-1')
    expect(gridContainer).toHaveClass('md:grid-cols-2')
    expect(gridContainer).toHaveClass('gap-4')
  })
})