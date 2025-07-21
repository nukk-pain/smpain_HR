import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PayrollManagement from './PayrollManagement'
import { NotificationProvider } from '@/components/NotificationProvider'

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { _id: 'user1', role: 'admin', name: 'Test User' }
  })
}))

// Mock API service
vi.mock('@/services/api', () => ({
  default: {
    getDashboardStats: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_employees: 50,
        total_payroll: 100000000,
        pending_uploads: 5,
        current_month: '2024-01'
      }
    }),
    getPayrollStats: vi.fn().mockResolvedValue({
      success: true,
      data: {
        employee_count: 50,
        grand_total: 100000000
      }
    })
  }
}))

// Mock child components that are already migrated
vi.mock('@/components/PayrollGrid', () => ({
  default: () => <div>PayrollGrid Component</div>
}))

vi.mock('@/components/PayrollDashboard', () => ({
  default: () => <div>PayrollDashboard Component</div>
}))

vi.mock('@/components/BonusManagement', () => ({
  default: () => <div>BonusManagement Component</div>
}))

vi.mock('@/components/SalesManagement', () => ({
  default: () => <div>SalesManagement Component</div>
}))

vi.mock('@/components/IncentiveCalculator', () => ({
  default: () => <div>IncentiveCalculator Component</div>
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('PayrollManagement Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<PayrollManagement />)
    
    // Wait for component to load
    await screen.findByText('급여 관리')
    
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
      'MuiTabs-root',
      'MuiTab-root',
      'MuiTabPanel-root',
      'MuiPaper-root',
      'MuiChip-root',
      'MuiDivider-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<PayrollManagement />)
    
    // Wait for component to load
    await screen.findByText('급여 관리')
    
    // ✅ Should have shadcn button (month navigation)
    const prevButton = screen.getByText('이전 월')
    expect(prevButton.className).toContain('inline-flex')
    expect(prevButton.className).toContain('items-center')
  })

  it('should display payroll management interface', async () => {
    renderWithProvider(<PayrollManagement />)
    
    // ✅ Should show payroll management title
    expect(await screen.findByText('급여 관리')).toBeInTheDocument()
    
    // ✅ Should show user role chip
    expect(screen.getByText('관리자')).toBeInTheDocument()
    
    // ✅ Should show statistics cards
    expect(screen.getByText('총 직원 수')).toBeInTheDocument()
    expect(screen.getByText('당월 총 급여')).toBeInTheDocument()
    
    // ✅ Should show month navigation
    expect(screen.getByText('이전 월')).toBeInTheDocument()
    expect(screen.getByText('다음 월')).toBeInTheDocument()
    
    // ✅ Should show tab navigation
    expect(screen.getByText('대시보드')).toBeInTheDocument()
    expect(screen.getByText('급여 현황')).toBeInTheDocument()
    expect(screen.getByText('매출 관리')).toBeInTheDocument()
    expect(screen.getByText('상여금/포상금')).toBeInTheDocument()
    expect(screen.getByText('인센티브 계산')).toBeInTheDocument()
    expect(screen.getByText('파일 업로드')).toBeInTheDocument()
  })
})