import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UnifiedDashboard from './UnifiedDashboard'

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      full_name: 'Test User',
      name: 'Test User',
      role: 'admin',
      permissions: ['payroll:view', 'payroll:manage', 'leave:view', 'leave:manage', 'users:view']
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
    getUserStats: vi.fn().mockResolvedValue({
      data: {
        totalUsers: 120,
        activeUsers: 110,
        byDepartment: { 'IT': 30, '영업': 25, '마케팅': 15 },
        byRole: { 'admin': 5, 'manager': 10, 'user': 105 },
        newThisMonth: 3
      }
    }),
    getDashboardStats: vi.fn().mockResolvedValue({
      data: {
        total_employees: 110,
        total_payroll: 450000000,
        total_incentive: 12000000,
        total_bonus: 8000000,
        avg_salary: 4090909,
        trends: []
      }
    }),
    get: vi.fn().mockResolvedValue({
      data: {
        topPerformers: [],
        departmentRankings: [],
        dbHealth: 'excellent',
        avgResponseTime: 150,
        activeConnections: 25,
        systemLoad: 45,
        lastBackup: '2024-01-15'
      }
    })
  }
}))

describe('UnifiedDashboard Migration', () => {
  it('should not use MUI components', () => {
    render(<UnifiedDashboard />)
    
    // ✅ Check that no MUI classes are present
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
      '[class*="MuiCircularProgress"]',
      '[class*="MuiSkeleton"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should display dashboard title', async () => {
    render(<UnifiedDashboard />)
    
    // ✅ Should show dashboard heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('관리자 대시보드')
    })
  })

  it('should render summary cards', async () => {
    render(<UnifiedDashboard />)
    
    // ✅ Should display key metrics
    await waitFor(() => {
      expect(screen.getByText('전체 직원')).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByText('재직 중: 110명')).toBeInTheDocument()
    })
  })

  it('should render recent sections', async () => {
    render(<UnifiedDashboard />)
    
    // ✅ Should show section headings
    await waitFor(() => {
      expect(screen.getByText('빠른 작업')).toBeInTheDocument()
      expect(screen.getByText('시스템 상태')).toBeInTheDocument()
      expect(screen.getByText('시스템 알림')).toBeInTheDocument()
    })
  })

  it('should use shadcn/ui card components', async () => {
    const { container } = render(<UnifiedDashboard />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})