import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TeamLeaveStatus from './TeamLeaveStatus'

// Mock date-fns
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    format: vi.fn().mockImplementation((date, formatStr) => {
      if (formatStr === 'yyyy.MM.dd') return '2024.01.15'
      return '2024-01-15'
    })
  }
})

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn().mockImplementation((url) => {
      if (url === '/leave/department-stats') {
        return Promise.resolve({
          data: [
            {
              department: 'IT',
              totalMembers: 10,
              activeMembers: 9,
              avgLeaveUsage: 45.5,
              totalLeaveUsed: 50,
              totalLeaveRemaining: 150,
              pendingRequests: 3,
              approvalRate: 85.5
            }
          ]
        })
      }
      return Promise.resolve({
        data: {
          members: [
            {
              _id: '1',
              name: 'John Doe',
              employeeId: 'EMP001',
              position: 'Developer',
              department: 'IT',
              leaveBalance: {
                totalAnnualLeave: 20,
                usedAnnualLeave: 5,
                remainingAnnualLeave: 15,
                pendingAnnualLeave: 2
              },
              recentLeaves: [],
              upcomingLeaves: []
            }
          ],
          departments: ['IT', 'HR', 'Finance']
        }
      })
    }),
    getEmployeeLeaveLog: vi.fn().mockResolvedValue({
      data: {
        balance: {
          totalAnnualLeave: 20,
          usedAnnualLeave: 5,
          remainingAnnualLeave: 15,
          pendingAnnualLeave: 2
        },
        leaveHistory: [
          {
            leaveType: 'annual',
            startDate: '2024-01-15',
            endDate: '2024-01-17',
            daysCount: 3,
            status: 'approved',
            reason: 'Vacation',
            createdAt: '2024-01-10'
          }
        ]
      }
    })
  }
}))

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      role: 'admin'
    }
  })
}))

// Mock NotificationProvider
vi.mock('./NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn()
  })
}))

describe('TeamLeaveStatus Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not use MUI components', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Check that no MUI classes are present
    await waitFor(() => {
      const muiClasses = [
        '[class*="MuiBox"]',
        '[class*="MuiCard"]',
        '[class*="MuiCardContent"]',
        '[class*="MuiTypography"]',
        '[class*="MuiButton"]',
        '[class*="MuiGrid"]',
        '[class*="MuiFormControl"]',
        '[class*="MuiSelect"]',
        '[class*="MuiTable"]',
        '[class*="MuiTableCell"]',
        '[class*="MuiTableRow"]',
        '[class*="MuiPaper"]',
        '[class*="MuiDialog"]',
        '[class*="MuiAvatar"]',
        '[class*="MuiChip"]',
        '[class*="MuiAlert"]',
        '[class*="MuiLinearProgress"]',
        '[class*="MuiCircularProgress"]',
        '[class*="MuiList"]',
        '[class*="MuiIconButton"]',
        '[class*="MuiTooltip"]'
      ]
      
      muiClasses.forEach(selector => {
        const element = document.querySelector(selector)
        expect(element).toBeNull()
      })
    })
  })

  it('should display team leave status header', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Should show team leave status title
    await waitFor(() => {
      expect(screen.getByText(/팀 휴가 현황/i)).toBeInTheDocument()
    })
  })

  it('should show year and department filters', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Should show filter controls (year and department)
    await waitFor(() => {
      const comboboxes = screen.getAllByRole('combobox')
      expect(comboboxes).toHaveLength(2) // year and department filters
    })
  })

  it('should display team overview stats', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Should show team statistics
    await waitFor(() => {
      expect(screen.getByText(/팀원 수/i)).toBeInTheDocument()
      expect(screen.getByText(/총 사용 연차/i)).toBeInTheDocument()
      expect(screen.getByText(/대기중인 신청/i)).toBeInTheDocument()
      expect(screen.getByText(/평균 사용률/i)).toBeInTheDocument()
    })
  })

  it('should display team members table', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Should show team members table
    await waitFor(() => {
      expect(screen.getByText(/팀원 휴가 현황/i)).toBeInTheDocument()
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
      expect(screen.getByText(/Developer/i)).toBeInTheDocument()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = render(<TeamLeaveStatus />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  it('should handle department stats view mode', async () => {
    render(<TeamLeaveStatus viewMode="department" />)
    
    // ✅ Should show department statistics title
    await waitFor(() => {
      expect(screen.getByText(/부서별 휴가 통계/i)).toBeInTheDocument()
    })
  })

  it('should handle member detail click', async () => {
    render(<TeamLeaveStatus />)
    
    // ✅ Should handle member detail interaction
    await waitFor(() => {
      const detailButtons = screen.getAllByRole('button')
      expect(detailButtons.length).toBeGreaterThan(0)
    })
  })
})