import { render, screen } from '@testing-library/react'
import { DataTable } from './DataTable'

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
]

describe('DataTable', () => {
  it('should migrate MUI Table to shadcn/ui Table', () => {
    render(<DataTable data={mockData} />)
    
    // Should render a table
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Should have proper table structure
    const columnHeader = screen.getByRole('columnheader', { name: /name/i })
    expect(columnHeader).toBeInTheDocument()
    
    // Should display data
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })
})