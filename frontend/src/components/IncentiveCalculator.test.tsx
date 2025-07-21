import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import IncentiveCalculator from './IncentiveCalculator'
import { NotificationProvider } from './NotificationProvider'

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: { _id: 'user1', role: 'admin', name: 'Test User' }
  })
}))

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          name: 'Test User',
          department: 'Sales',
          position: 'Manager'
        }
      ]
    }),
    get: vi.fn().mockResolvedValue({
      success: false,
      data: null
    }),
    post: vi.fn().mockResolvedValue({
      success: true,
      data: {
        success: true,
        result: 5000,
        breakdown: { baseCommission: 5000 },
        formula_used: 'sales_amount * 0.05',
        variables_used: { base_rate: 0.05 }
      }
    }),
    put: vi.fn().mockResolvedValue({ success: true })
  }
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('IncentiveCalculator Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<IncentiveCalculator />)
    
    // Wait for component to load
    await screen.findByText('인센티브 계산기')
    
    // ❌ Should NOT have MUI classes
    const muiClasses = [
      'MuiBox-root',
      'MuiButton-root',
      'MuiCard-root',
      'MuiCardContent-root',
      'MuiTypography-root',
      'MuiGrid-root',
      'MuiTextField-root',
      'MuiFormControl-root',
      'MuiInputLabel-root',
      'MuiSelect-root',
      'MuiMenuItem-root',
      'MuiAlert-root',
      'MuiDivider-root',
      'MuiChip-root',
      'MuiPaper-root',
      'MuiTable-root',
      'MuiTableBody-root',
      'MuiTableCell-root',
      'MuiTableContainer-root',
      'MuiTableHead-root',
      'MuiTableRow-root',
      'MuiDialog-root',
      'MuiDialogTitle-root',
      'MuiDialogContent-root',
      'MuiDialogActions-root',
      'MuiStack-root',
      'MuiAccordion-root',
      'MuiAccordionSummary-root',
      'MuiAccordionDetails-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<IncentiveCalculator />)
    
    // Wait for component to load
    await screen.findByText('인센티브 계산기')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('도움말')
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
  })

  it('should display incentive calculator interface', async () => {
    renderWithProvider(<IncentiveCalculator />)
    
    // ✅ Should show incentive calculator title
    expect(await screen.findByText('인센티브 계산기')).toBeInTheDocument()
    
    // ✅ Should show help button
    expect(screen.getByText('도움말')).toBeInTheDocument()
    
    // ✅ Should show employee selection
    expect(screen.getByRole('heading', { name: '직원 선택' })).toBeInTheDocument()
    
    // ✅ Should show formula section
    expect(screen.getByText('인센티브 수식')).toBeInTheDocument()
  })
})