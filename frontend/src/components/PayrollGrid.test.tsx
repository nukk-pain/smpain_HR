import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PayrollGrid from './PayrollGrid'

// Mock ag-grid-react
vi.mock('ag-grid-react', () => ({
  AgGridReact: function MockAgGridReact() {
    return <div data-testid="ag-grid">AG Grid</div>
  }
}))

// Mock apiService
vi.mock('@/services/api', () => ({
  default: {
    getMonthlyPayments: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    updatePayroll: vi.fn().mockResolvedValue({ success: true })
  }
}))

// Mock NotificationProvider
vi.mock('./NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}))

describe('PayrollGrid Migration', () => {
  it('should migrate from MUI to shadcn/ui successfully', async () => {
    render(<PayrollGrid yearMonth="2025-01" />)
    
    // ✅ Validate Paper → Card migration
    await screen.findByText(/급여 현황/i)
    
    // ✅ Validate no MUI classes remain
    const paper = document.querySelector('[class*="MuiPaper"]')
    expect(paper).toBeNull()
    
    const box = document.querySelector('[class*="MuiBox"]')
    expect(box).toBeNull()
    
    const button = document.querySelector('[class*="MuiButton"]')
    expect(button).toBeNull()
    
    const iconButton = document.querySelector('[class*="MuiIconButton"]')
    expect(iconButton).toBeNull()
    
    const tooltip = document.querySelector('[class*="MuiTooltip"]')
    expect(tooltip).toBeNull()
  })
  
  it('should show empty state when no data', async () => {
    render(<PayrollGrid yearMonth="2025-01" />)
    
    // ✅ Should show empty state message (after loading completes)
    await screen.findByText(/급여 데이터가 없습니다/i)
  })
  
  it('should show export button', () => {
    render(<PayrollGrid yearMonth="2025-01" />)
    
    // ✅ Export button should be present
    const exportButton = screen.getByRole('button', { name: /excel 내보내기/i })
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).toBeDisabled() // Should be disabled when no data
  })
})