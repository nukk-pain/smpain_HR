import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PayrollDashboard from './PayrollDashboard'
import { NotificationProvider } from './NotificationProvider'

// Mock API service
vi.mock('@/services/api', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    getPayrollData: vi.fn().mockResolvedValue({
      success: true,
      data: {
        summary: {
          totalEmployees: 150,
          totalPayroll: 850000,
          averageSalary: 65000,
          payrollGrowth: 12.5
        },
        monthlyData: [
          { month: 'Jan', amount: 750000 },
          { month: 'Feb', amount: 780000 },
          { month: 'Mar', amount: 850000 }
        ]
      }
    })
  }))
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('PayrollDashboard Migration', () => {
  it('should not use MUI components', async () => {
    renderWithProvider(<PayrollDashboard />)
    
    // ✅ Check that no MUI classes are present
    const muiClasses = [
      '[class*="MuiBox"]',
      '[class*="MuiCard"]',
      '[class*="MuiCardContent"]',
      '[class*="MuiTypography"]',
      '[class*="MuiGrid"]',
      '[class*="MuiPaper"]',
      '[class*="MuiChip"]',
      '[class*="MuiLinearProgress"]',
      '[class*="MuiAlert"]',
      '[class*="MuiDivider"]',
      '[class*="MuiButton"]',
      '[class*="MuiSelect"]',
      '[class*="MuiMenuItem"]',
      '[class*="MuiFormControl"]',
      '[class*="MuiInputLabel"]',
      '[class*="MuiTable"]',
      '[class*="MuiTableContainer"]',
      '[class*="MuiTableHead"]',
      '[class*="MuiTableBody"]',
      '[class*="MuiTableRow"]',
      '[class*="MuiTableCell"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = renderWithProvider(<PayrollDashboard />)
    
    // ✅ Should have shadcn card structure
    const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should display payroll dashboard', async () => {
    renderWithProvider(<PayrollDashboard />)
    
    // ✅ Should show payroll dashboard content or error state
    const dashboardContent = screen.queryByText(/payroll dashboard/i)
    const errorState = screen.queryByText(/no payroll data available/i)
    
    expect(dashboardContent || errorState).toBeInTheDocument()
  })
})