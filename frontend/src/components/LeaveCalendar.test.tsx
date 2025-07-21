import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import LeaveCalendar from './LeaveCalendar'

// Mock date-fns
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    format: vi.fn().mockImplementation((date, formatStr, options) => {
      if (formatStr === 'yyyy-MM') return '2024-01'
      if (formatStr === 'yyyy-MM-dd') return '2024-01-15'
      if (formatStr === 'yyyy년 MM월') return '2024년 01월'
      if (formatStr === 'yyyy년 MM월 dd일 (E)') return '2024년 01월 15일 (월)'
      if (formatStr === 'MM/dd') return '01/15'
      if (formatStr === 'd') return '15'
      return '2024-01-15'
    })
  }
})

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Doe',
          userDepartment: 'IT',
          leaveType: 'annual',
          startDate: '2024-01-15',
          endDate: '2024-01-15',
          daysCount: 1,
          status: 'approved',
          reason: 'Rest day'
        }
      ]
    }),
    post: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true })
  }
}))

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      role: 'admin',
      permissions: ['leave:manage']
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

describe('LeaveCalendar Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not use MUI components', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Check that no MUI classes are present
    await waitFor(() => {
      const muiClasses = [
        '[class*="MuiBox"]',
        '[class*="MuiCard"]',
        '[class*="MuiCardContent"]',
        '[class*="MuiTypography"]',
        '[class*="MuiButton"]',
        '[class*="MuiIconButton"]',
        '[class*="MuiChip"]',
        '[class*="MuiPaper"]',
        '[class*="MuiDialog"]',
        '[class*="MuiTextField"]',
        '[class*="MuiGrid"]',
        '[class*="MuiSelect"]',
        '[class*="MuiFormControl"]',
        '[class*="MuiList"]',
        '[class*="MuiAlert"]',
        '[class*="MuiSwitch"]',
        '[class*="MuiCircularProgress"]',
        '[class*="MuiBadge"]',
        '[class*="MuiAvatar"]'
      ]
      
      muiClasses.forEach(selector => {
        const element = document.querySelector(selector)
        expect(element).toBeNull()
      })
    })
  })

  it('should display calendar header', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Should show main calendar title
    await waitFor(() => {
      expect(screen.getByText(/전체 직원 휴가 달력/i)).toBeInTheDocument()
    })
  })

  it('should show month navigation', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Should show month navigation with current month
    await waitFor(() => {
      expect(screen.getByText(/2024년 01월/i)).toBeInTheDocument()
      expect(screen.getByText(/오늘/i)).toBeInTheDocument()
    })
  })

  it('should show department filter', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Should have department filter dropdown with role combobox
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('should display management mode toggle for admin', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Should show management mode toggle for admin users
    await waitFor(() => {
      expect(screen.getByText(/관리 모드/i)).toBeInTheDocument()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = render(<LeaveCalendar />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  it('should show calendar legend', async () => {
    render(<LeaveCalendar />)
    
    // ✅ Should display calendar legend
    await waitFor(() => {
      expect(screen.getByText(/범례/i)).toBeInTheDocument()
      expect(screen.getByText(/연차 휴가/i)).toBeInTheDocument()
      expect(screen.getByText(/기타 휴가/i)).toBeInTheDocument()
    })
  })
})