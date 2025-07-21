import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SalesManagement from './SalesManagement'
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
    getSalesData: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          user_id: 'user1',
          employee_name: 'Test Employee',
          department: 'Sales',
          sales_amount: 50000,
          target_amount: 40000,
          achievement_rate: 125,
          incentive_rate: 0.05,
          calculated_incentive: 2500,
          year_month: '2024-01',
          notes: 'Good performance',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    }),
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'user1',
          name: 'Test Employee',
          department: 'Sales',
          position: 'Sales Rep'
        }
      ]
    }),
    createSalesData: vi.fn().mockResolvedValue({ success: true }),
    updateSalesData: vi.fn().mockResolvedValue({ success: true }),
    deleteSalesData: vi.fn().mockResolvedValue({ success: true }),
    simulateIncentive: vi.fn().mockResolvedValue({
      success: true,
      data: {
        sales_amount: 50000,
        incentive_amount: 2500,
        achievement_rate: 125,
        bonus_tier: 'Gold',
        total_commission: 2750
      }
    }),
    exportSalesData: vi.fn().mockResolvedValue({ success: true })
  }
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('SalesManagement Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<SalesManagement yearMonth="2024-01" />)
    
    // Wait for component to load
    await screen.findByText('2024년 01월 매출 관리')
    
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
      'MuiDialog-root',
      'MuiDialogTitle-root',
      'MuiDialogContent-root',
      'MuiDialogActions-root',
      'MuiTable-root',
      'MuiTableBody-root',
      'MuiTableCell-root',
      'MuiTableContainer-root',
      'MuiTableHead-root',
      'MuiTableRow-root',
      'MuiIconButton-root',
      'MuiChip-root',
      'MuiPaper-root',
      'MuiAlert-root',
      'MuiTooltip-root',
      'MuiStack-root',
      'MuiCircularProgress-root',
      'MuiDivider-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<SalesManagement yearMonth="2024-01" />)
    
    // Wait for component to load
    await screen.findByText('2024년 01월 매출 관리')
    
    // ✅ Should have shadcn button
    const addButton = screen.getByText('매출 추가')
    expect(addButton.className).toContain('inline-flex')
    expect(addButton.className).toContain('items-center')
  })

  it('should display sales management interface', async () => {
    renderWithProvider(<SalesManagement yearMonth="2024-01" />)
    
    // ✅ Should show sales management title
    expect(await screen.findByText('2024년 01월 매출 관리')).toBeInTheDocument()
    
    // ✅ Should show action buttons
    expect(screen.getByText('매출 추가')).toBeInTheDocument()
    expect(screen.getByText('새로고침')).toBeInTheDocument()
    
    // ✅ Should show sales data in table
    expect(screen.getByText('직원명')).toBeInTheDocument()
    expect(screen.getByText('매출')).toBeInTheDocument()
  })
})