import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UserDashboard from './UserDashboard'

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      full_name: 'Test User',
      name: 'Test User',
      role: 'user',
      permissions: ['leave:view']
    }
  })
}))

// Mock NotificationProvider
vi.mock('./NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}))

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getLeaveBalance: vi.fn().mockResolvedValue({
      data: {
        totalAnnualLeave: 15,
        usedAnnualLeave: 8,
        remainingAnnualLeave: 7,
        pendingAnnualLeave: 2
      }
    }),
    getLeaveRequests: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          leaveType: 'annual',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          status: 'approved',
          daysCount: 3,
          reason: '휴가',
          createdAt: '2024-01-10'
        },
        {
          id: 2,
          leaveType: 'personal',
          startDate: '2024-01-20',
          endDate: '2024-01-20',
          status: 'pending',
          daysCount: 1,
          reason: '개인 사유',
          createdAt: '2024-01-18'
        }
      ]
    })
  }
}))

describe('UserDashboard Migration', () => {
  it('should not use MUI components', async () => {
    render(<UserDashboard />)
    
    // ✅ Check that no MUI classes are present
    await waitFor(() => {
      const muiClasses = [
        '[class*="MuiGrid"]',
        '[class*="MuiCard"]',
        '[class*="MuiCardContent"]',
        '[class*="MuiTypography"]',
        '[class*="MuiBox"]',
        '[class*="MuiButton"]',
        '[class*="MuiIconButton"]',
        '[class*="MuiPaper"]',
        '[class*="MuiContainer"]',
        '[class*="MuiChip"]',
        '[class*="MuiList"]',
        '[class*="MuiListItem"]',
        '[class*="MuiListItemText"]',
        '[class*="MuiLinearProgress"]',
        '[class*="MuiAvatar"]'
      ]
      
      muiClasses.forEach(selector => {
        const element = document.querySelector(selector)
        expect(element).toBeNull()
      })
    })
  })

  it('should display user dashboard title', async () => {
    render(<UserDashboard />)
    
    // ✅ Should show dashboard heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test User님의 대시보드')
    })
  })

  it('should render leave balance cards', async () => {
    render(<UserDashboard />)
    
    // ✅ Should display leave balance metrics
    await waitFor(() => {
      expect(screen.getByText('휴가 현황')).toBeInTheDocument()
      expect(screen.getByText('잔여 연차 / 15일')).toBeInTheDocument()
      expect(screen.getByText('사용: 8일')).toBeInTheDocument()
    })
  })

  it('should render recent leave requests', async () => {
    render(<UserDashboard />)
    
    // ✅ Should show recent leave section
    await waitFor(() => {
      expect(screen.getByText(/최근 휴가 신청 내역/)).toBeInTheDocument()
      expect(screen.getByText('연차')).toBeInTheDocument()
    })
  })

  it('should use shadcn/ui card components', async () => {
    const { container } = render(<UserDashboard />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})