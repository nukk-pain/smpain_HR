import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AdminBulkOperations from './AdminBulkOperations'
import { NotificationProvider } from '@/components/NotificationProvider'

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { _id: 'user1', role: 'admin', name: 'Test User' }
  })
}))

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          leaveType: 'Annual',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          employee: { name: 'Test Employee', department: 'IT' },
          status: 'pending',
          submittedAt: '2024-01-01'
        }
      ]
    }),
    getBulkPendingRequests: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          leaveType: 'annual',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          daysCount: 3,
          reason: 'Test reason',
          requestedAt: '2024-01-01',
          user: { 
            name: 'Test Employee', 
            department: 'IT',
            position: 'Developer'
          }
        }
      ]
    }),
    getDepartments: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { _id: '1', name: 'IT', description: 'Information Technology' },
        { _id: '2', name: 'HR', description: 'Human Resources' }
      ]
    }),
    put: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ success: true }),
    bulkApproveRequests: vi.fn().mockResolvedValue({ success: true }),
    bulkRejectRequests: vi.fn().mockResolvedValue({ success: true }),
    exportBulkData: vi.fn().mockResolvedValue({ success: true })
  }
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('AdminBulkOperations Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<AdminBulkOperations />)
    
    // Wait for component to load
    await screen.findByText('🔄 휴가 일괄 처리')
    
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
      'MuiDialog-root',
      'MuiDialogTitle-root',
      'MuiDialogContent-root',
      'MuiDialogActions-root',
      'MuiPaper-root',
      'MuiCheckbox-root',
      'MuiAlert-root',
      'MuiChip-root',
      'MuiCircularProgress-root',
      'MuiAccordion-root',
      'MuiAccordionSummary-root',
      'MuiAccordionDetails-root',
      'MuiLinearProgress-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<AdminBulkOperations />)
    
    // Wait for component to load
    await screen.findByText('🔄 휴가 일괄 처리')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('연차 이월 처리')
    expect(button.className).toContain('flex')
    expect(button.className).toContain('items-center')
  })

  it('should display admin bulk operations interface', async () => {
    renderWithProvider(<AdminBulkOperations />)
    
    // ✅ Should show bulk operations title
    expect(await screen.findByText('🔄 휴가 일괄 처리')).toBeInTheDocument()
    
    // ✅ Should show action buttons (when requests are selected)
    expect(screen.getByText('연차 이월 처리')).toBeInTheDocument()
    expect(screen.getByText('필터 초기화')).toBeInTheDocument()
    
    // ✅ Should show pending requests section
    expect(screen.getByText('대기중인 휴가 신청 (1건)')).toBeInTheDocument()
  })
})