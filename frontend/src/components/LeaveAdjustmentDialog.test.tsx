import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import LeaveAdjustmentDialog from './LeaveAdjustmentDialog'
import { NotificationProvider } from './NotificationProvider'

// Mock API service
vi.mock('../services/api', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    getEmployeeLeaveDetails: vi.fn().mockResolvedValue({
      success: true,
      data: {
        employee: {
          id: '1',
          name: 'Test Employee',
          department: 'Engineering',
          position: 'Software Engineer',
          hireDate: '2020-01-01',
          yearsOfService: 4
        },
        leaveInfo: {
          annualEntitlement: 15,
          currentBalance: 12,
          totalUsedThisYear: 3
        },
        adjustments: [
          {
            _id: '1',
            type: 'add',
            amount: 2,
            reason: 'Test adjustment',
            adjustedBy: 'admin',
            adjustedByName: 'Admin',
            adjustedAt: '2024-01-15T10:00:00Z',
            beforeBalance: 10,
            afterBalance: 12
          }
        ]
      }
    }),
    adjustEmployeeLeave: vi.fn().mockResolvedValue({ success: true })
  }))
}))

const mockEmployee = {
  id: '1',
  name: 'Test Employee',
  department: 'Engineering',
  position: 'Software Engineer',
  hireDate: '2020-01-01',
  yearsOfService: 4
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('LeaveAdjustmentDialog Migration', () => {
  it('should not use MUI components', async () => {
    renderWithProvider(
      <LeaveAdjustmentDialog
        open={true}
        onClose={() => {}}
        employeeId={mockEmployee.id}
        employeeName={mockEmployee.name}
        onAdjustmentComplete={() => {}}
      />
    )
    
    // ✅ Check that no MUI classes are present
    const muiClasses = [
      '[class*="MuiDialog"]',
      '[class*="MuiDialogTitle"]',
      '[class*="MuiDialogContent"]',
      '[class*="MuiDialogActions"]',
      '[class*="MuiButton"]',
      '[class*="MuiTextField"]',
      '[class*="MuiMenuItem"]',
      '[class*="MuiGrid"]',
      '[class*="MuiTypography"]',
      '[class*="MuiBox"]',
      '[class*="MuiAlert"]',
      '[class*="MuiDivider"]',
      '[class*="MuiTable"]',
      '[class*="MuiTableBody"]',
      '[class*="MuiTableCell"]',
      '[class*="MuiTableContainer"]',
      '[class*="MuiTableHead"]',
      '[class*="MuiTableRow"]',
      '[class*="MuiPaper"]',
      '[class*="MuiChip"]',
      '[class*="MuiCircularProgress"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(
      <LeaveAdjustmentDialog
        open={true}
        onClose={() => {}}
        employeeId={mockEmployee.id}
        employeeName={mockEmployee.name}
        onAdjustmentComplete={() => {}}
      />
    )
    
    // ✅ Should have shadcn dialog structure
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
  })

  it('should display leave adjustment dialog interface', async () => {
    renderWithProvider(
      <LeaveAdjustmentDialog
        open={true}
        onClose={() => {}}
        employeeId={mockEmployee.id}
        employeeName={mockEmployee.name}
        onAdjustmentComplete={() => {}}
      />
    )
    
    // ✅ Should show leave adjustment title
    expect(await screen.findByText(/연차 조정/i)).toBeInTheDocument()
    expect(await screen.findByText(/Test Employee/i)).toBeInTheDocument()
  })
})