import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AdminLeavePolicy from './AdminLeavePolicy'
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
    getLeavePolicy: vi.fn().mockResolvedValue({
      success: true,
      data: {
        policyId: 'policy1',
        annualLeaveRules: {
          firstYear: 15,
          baseSecondYear: 20,
          maxAnnualLeave: 25,
          monthlyProration: true
        },
        specialRules: {
          saturdayLeave: 0.5,
          sundayLeave: 1,
          holidayLeave: 1
        },
        leaveTypes: {
          annual: {
            advanceNotice: 3,
            maxConsecutive: 10
          },
          family: {
            managerApproval: true,
            documentRequired: true
          },
          personal: {
            yearlyLimit: 5,
            paid: true
          }
        },
        businessRules: {
          minAdvanceDays: 3,
          maxConcurrentRequests: 5
        },
        carryOverRules: {
          maxCarryOverDays: 5,
          carryOverDeadline: '02-28'
        },
        updatedAt: '2024-01-01T00:00:00Z',
        updatedBy: 'Admin User'
      }
    }),
    updateLeavePolicy: vi.fn().mockResolvedValue({ success: true }),
    previewPolicyImpact: vi.fn().mockResolvedValue({
      success: true,
      data: {
        affectedEmployees: 50,
        totalLeaveChange: 100
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

describe('AdminLeavePolicy Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<AdminLeavePolicy />)
    
    // Wait for component to load
    await screen.findByText('📐 휴가 정책 관리')
    
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
      'MuiSwitch-root',
      'MuiFormControlLabel-root',
      'MuiDivider-root',
      'MuiAlert-root',
      'MuiPaper-root',
      'MuiTable-root',
      'MuiTableBody-root',
      'MuiTableCell-root',
      'MuiTableContainer-root',
      'MuiTableHead-root',
      'MuiTableRow-root',
      'MuiIconButton-root',
      'MuiTooltip-root',
      'MuiCircularProgress-root',
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
    renderWithProvider(<AdminLeavePolicy />)
    
    // Wait for component to load
    await screen.findByText('📐 휴가 정책 관리')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('저장')
    expect(button.className).toContain('flex')
    expect(button.className).toContain('items-center')
  })

  it('should display admin leave policy interface', async () => {
    renderWithProvider(<AdminLeavePolicy />)
    
    // ✅ Should show leave policy title
    expect(await screen.findByText('📐 휴가 정책 관리')).toBeInTheDocument()
    
    // ✅ Should show action buttons
    expect(screen.getByText('저장')).toBeInTheDocument()
    expect(screen.getByText('초기화')).toBeInTheDocument()
    
    // ✅ Should show policy sections
    expect(screen.getByText('🗓️ 연차 계산 규칙')).toBeInTheDocument()
    expect(screen.getByText('⏰ 특별 규칙')).toBeInTheDocument()
  })
})