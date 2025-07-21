import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AdminLeaveOverview from './AdminLeaveOverview'
import { NotificationProvider } from '@/components/NotificationProvider'

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { _id: 'user1', role: 'admin', name: 'Test User' }
  })
}))

// Mock API service
vi.mock('@/services/api', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    getLeaveOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalEmployees: 50,
        leaveStatistics: {
          totalRequests: 100,
          approvedRequests: 80,
          pendingRequests: 15,
          rejectedRequests: 5
        },
        departmentSummary: [
          {
            department: 'IT',
            totalEmployees: 10,
            onLeave: 2,
            pendingRequests: 1
          }
        ]
      }
    }),
    getEmployeeLeaveBalance: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          employeeId: 'emp1',
          name: 'Test Employee',
          department: 'IT',
          annualLeaveBalance: 15,
          usedLeave: 5
        }
      ]
    }),
    exportLeaveData: vi.fn().mockResolvedValue({ success: true }),
    get: vi.fn().mockResolvedValue({
      data: {
        statistics: {
          totalEmployees: 50,
          averageUsageRate: 75,
          highRiskCount: 5
        },
        employees: [
          {
            employeeId: 'emp1',
            name: 'Test Employee',
            department: 'IT',
            position: 'Developer',
            totalAnnualLeave: 20,
            usedAnnualLeave: 10,
            pendingAnnualLeave: 2,
            remainingAnnualLeave: 8,
            usageRate: 50,
            riskLevel: 'low',
            yearsOfService: 3
          }
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

describe('AdminLeaveOverview Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<AdminLeaveOverview />)
    
    // Wait for component to load
    await screen.findByText('👥 휴가 현황 관리')
    
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
      'MuiTable-root',
      'MuiTableBody-root',
      'MuiTableCell-root',
      'MuiTableContainer-root',
      'MuiTableHead-root',
      'MuiTableRow-root',
      'MuiPaper-root',
      'MuiChip-root',
      'MuiLinearProgress-root',
      'MuiAlert-root',
      'MuiCircularProgress-root',
      'MuiInputAdornment-root',
      'MuiIconButton-root',
      'MuiTooltip-root',
      'MuiStack-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<AdminLeaveOverview />)
    
    // Wait for component to load
    await screen.findByText('👥 휴가 현황 관리')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('데이터 내보내기')
    expect(button.className).toContain('flex')
    expect(button.className).toContain('items-center')
  })

  it('should display admin leave overview interface', async () => {
    renderWithProvider(<AdminLeaveOverview />)
    
    // ✅ Should show leave overview title
    expect(await screen.findByText('👥 휴가 현황 관리')).toBeInTheDocument()
    
    // ✅ Should show action buttons
    expect(screen.getByText('데이터 내보내기')).toBeInTheDocument()
    
    // ✅ Should show statistics section
    expect(screen.getByText('전체 통계')).toBeInTheDocument()
    expect(screen.getByText('부서별 현황')).toBeInTheDocument()
  })
})