import { render, screen } from '@testing-library/react'
import { ActionButton } from './ActionButton'

describe('ActionButton', () => {
  it('should replace EditIcon with Lucide\'s Edit icon', () => {
    render(<ActionButton action="edit" />)
    
    // Should find a button with edit functionality
    const editButton = screen.getByRole('button', { name: /edit/i })
    expect(editButton).toBeInTheDocument()
    
    // Should contain a Lucide Edit icon (by checking for the svg element)
    const icon = editButton.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('lucide-square-pen')
  })

  it('should replace DeleteIcon with Lucide\'s Trash2 icon', () => {
    render(<ActionButton action="delete" />)
    
    // Should find a button with delete functionality
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
    
    // Should contain a Lucide Trash2 icon
    const icon = deleteButton.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('lucide-trash-2')
  })
})