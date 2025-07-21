import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import LeaveManagement from './LeaveManagement'

// Mock API service
vi.mock('@/services/api', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    getLeaveRequests: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          leaveType: 'annual',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          reason: 'Personal time',
          status: 'pending',
          daysCount: 3,
          submittedAt: '2024-01-10',
          substituteEmployee: 'John Doe'
        },
        {
          id: '2',
          leaveType: 'sick',
          startDate: '2024-01-20',
          endDate: '2024-01-22',
          reason: 'Medical appointment',
          status: 'approved',
          daysCount: 3,
          submittedAt: '2024-01-18'
        }
      ]
    }),
    getLeaveBalance: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalAnnualLeave: 20,
        usedAnnualLeave: 5,
        remainingAnnualLeave: 15,
        totalSickLeave: 10,
        usedSickLeave: 2,
        remainingSickLeave: 8
      }
    }),
    getLeaveStats: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_requests: 12,
        pending_requests: 3,
        approved_requests: 8,
        rejected_requests: 1,
        total_days_used: 15,
        remaining_days: 15
      }
    }),
    createLeaveRequest: vi.fn().mockResolvedValue({ success: true }),
    updateLeaveRequest: vi.fn().mockResolvedValue({ success: true }),
    deleteLeaveRequest: vi.fn().mockResolvedValue({ success: true }),
    getCancellationHistory: vi.fn().mockResolvedValue({ 
      success: true, 
      data: [
        {
          id: '3',
          leaveType: 'annual',
          startDate: '2024-01-25',
          endDate: '2024-01-26',
          reason: 'Changed plans',
          status: 'cancelled',
          daysCount: 2,
          submittedAt: '2024-01-20',
          cancelledAt: '2024-01-22',
          cancellationReason: 'Work commitment'
        }
      ]
    })
  }))
}))

// Mock NotificationProvider
vi.mock('@/components/NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn()
  })
}))

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      role: 'employee',
      name: 'Test User',
      department: 'IT'
    }
  })
}))

// Mock useConfig hook
vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    leave: {
      types: {
        ANNUAL: 'annual',
        SICK: 'sick',
        PERSONAL: 'personal',
        SPECIAL: 'special'
      },
      statuses: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled'
      }
    },
    date: {
      format: 'yyyy-MM-dd'
    },
    message: {
      success: 'Success',
      error: 'Error'
    }
  }),
  useConfigProps: () => ({
    getLeaveSelectProps: vi.fn().mockReturnValue({
      label: 'Leave Type',
      options: [
        { value: 'annual', label: '연차' },
        { value: 'sick', label: '병가' },
        { value: 'personal', label: '개인휴가' },
        { value: 'special', label: '특별휴가' }
      ]
    }),
    getStatusChipProps: vi.fn().mockReturnValue({
      color: 'default',
      variant: 'filled'
    })
  })
}))

// Mock date-fns
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    format: vi.fn().mockImplementation((date, formatStr) => {
      if (formatStr === 'yyyy-MM-dd') return '2024-01-15'
      return '2024-01-15'
    }),
    parseISO: vi.fn().mockImplementation((dateStr) => new Date(dateStr)),
    differenceInBusinessDays: vi.fn().mockReturnValue(3)
  }
})

// Mock Date picker components
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ value, onChange, label, ...props }: any) => (
    <input
      data-testid="date-picker"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={label}
      {...props}
    />
  )
}))

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: vi.fn()
}))

describe('LeaveManagement Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not use MUI components', async () => {
    render(<LeaveManagement />)
    
    // ✅ Check that no MUI classes are present
    await waitFor(() => {
      const muiClasses = [
        '[class*="MuiBox"]',
        '[class*="MuiCard"]',
        '[class*="MuiCardContent"]',
        '[class*="MuiTypography"]',
        '[class*="MuiButton"]',
        '[class*="MuiTab"]',
        '[class*="MuiTabs"]',
        '[class*="MuiTable"]',
        '[class*="MuiTableCell"]',
        '[class*="MuiTableRow"]',
        '[class*="MuiTableContainer"]',
        '[class*="MuiPaper"]',
        '[class*="MuiDialog"]',
        '[class*="MuiDialogTitle"]',
        '[class*="MuiDialogContent"]',
        '[class*="MuiDialogActions"]',
        '[class*="MuiTextField"]',
        '[class*="MuiMenuItem"]',
        '[class*="MuiGrid"]',
        '[class*="MuiChip"]',
        '[class*="MuiAlert"]',
        '[class*="MuiLinearProgress"]',
        '[class*="MuiCircularProgress"]',
        '[class*="MuiIconButton"]',
        '[class*="MuiTooltip"]',
        '[class*="MuiBadge"]',
        '[class*="MuiAvatar"]',
        '[class*="MuiDivider"]',
        '[class*="MuiStack"]'
      ]
      
      muiClasses.forEach(selector => {
        const element = document.querySelector(selector)
        expect(element).toBeNull()
      })
    })
  })

  it('should display leave management header', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should show leave management title
    await waitFor(() => {
      expect(screen.getByText(/휴가 관리/i)).toBeInTheDocument()
    })
  })

  it('should show tab navigation', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should show tabs for leave requests, statistics, and cancellation history
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /내 휴가 신청/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /휴가 통계/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /취소 내역/i })).toBeInTheDocument()
    })
  })

  it('should show leave balance cards', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should show leave balance information
    await waitFor(() => {
      expect(screen.getByText(/총 연차/i)).toBeInTheDocument()
      expect(screen.getByText(/사용 연차/i)).toBeInTheDocument()
      expect(screen.getByText(/잔여 연차/i)).toBeInTheDocument()
    })
  })

  it('should display leave requests table', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should show leave requests table with data
    await waitFor(() => {
      expect(screen.getByText(/휴가 종류/i)).toBeInTheDocument()
      expect(screen.getByText(/시작일/i)).toBeInTheDocument()
      expect(screen.getByText(/종료일/i)).toBeInTheDocument()
      expect(screen.getByText(/상태/i)).toBeInTheDocument()
      expect(screen.getByText(/Personal time/i)).toBeInTheDocument()
      expect(screen.getByText(/Medical appointment/i)).toBeInTheDocument()
    })
  })

  it('should show add leave request button', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should have button to add new leave request
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /휴가 신청/i })).toBeInTheDocument()
    })
  })

  it('should handle leave request form dialog', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should open dialog when clicking add button
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /휴가 신청/i })
      fireEvent.click(addButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/새 휴가 신청/i)).toBeInTheDocument()
    })
  })

  it('should show leave statistics', async () => {
    const user = userEvent.setup()
    render(<LeaveManagement />)
    
    // ✅ Wait for leave balance data to load first
    await waitFor(() => {
      expect(screen.getByText(/사용 연차/i)).toBeInTheDocument()
    }, { timeout: 15000 })
    
    // ✅ Should show statistics when switching to stats tab
    const statsTab = screen.getByRole('tab', { name: /휴가 통계/i })
    await user.click(statsTab)
    
    // ✅ Wait for tab content to switch - check that requests tab content is no longer visible
    await waitFor(() => {
      expect(screen.queryByText(/내 휴가 신청 현황/i)).not.toBeInTheDocument()
    }, { timeout: 5000 })
    
    // ✅ Check for statistics content
    await waitFor(() => {
      expect(screen.getByText(/총 신청/i)).toBeInTheDocument()
      expect(screen.getByText(/승인됨/i)).toBeInTheDocument()
      expect(screen.getAllByText(/대기중/i).length).toBeGreaterThan(0) // Should find at least one instance
      expect(screen.getByText(/2건/i)).toBeInTheDocument() // Total requests
      expect(screen.getAllByText(/1건/i).length).toBeGreaterThan(0) // Should see 1 approved and 1 pending
    }, { timeout: 15000 })
  }, 20000)

  it('should display cancellation history', async () => {
    const user = userEvent.setup()
    render(<LeaveManagement />)
    
    // ✅ Wait for leave balance data to load first
    await waitFor(() => {
      expect(screen.getByText(/사용 연차/i)).toBeInTheDocument()
    }, { timeout: 15000 })
    
    // ✅ Should show cancellation history when switching to history tab
    const historyTab = screen.getByRole('tab', { name: /취소 내역/i })
    await user.click(historyTab)
    
    await waitFor(() => {
      expect(screen.getAllByText(/취소 내역/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Work commitment/i)).toBeInTheDocument()
    }, { timeout: 15000 })
  }, 20000)

  it('should use shadcn/ui components', async () => {
    const { container } = render(<LeaveManagement />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  it('should handle form validation', async () => {
    render(<LeaveManagement />)
    
    // ✅ Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText(/Personal time/i)).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // ✅ Should validate form inputs
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /휴가 신청/i })
      fireEvent.click(addButton)
    })
    
    // ✅ Should show validation errors for empty fields immediately when dialog opens
    await waitFor(() => {
      expect(screen.getByText(/시작일을 선택해주세요/i)).toBeInTheDocument()
    })
  })

  it('should handle leave request actions', async () => {
    render(<LeaveManagement />)
    
    // ✅ Should show action buttons for leave requests
    await waitFor(() => {
      const actionButtons = screen.getAllByRole('button')
      expect(actionButtons.length).toBeGreaterThan(0)
    })
  })
})