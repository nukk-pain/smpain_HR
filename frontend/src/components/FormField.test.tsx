import { render, screen } from '@testing-library/react'
import { FormField } from './FormField'

describe('FormField', () => {
  it('should migrate to an accessible Input and Label pair', () => {
    render(<FormField label="Name" id="name" />)
    
    // Should find input by its label
    const input = screen.getByLabelText('Name')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'name')
    
    // Should have proper accessibility connection
    const label = screen.getByText('Name')
    expect(label).toHaveAttribute('for', 'name')
  })
})