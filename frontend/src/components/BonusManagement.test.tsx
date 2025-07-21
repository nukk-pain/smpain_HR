import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BonusManagement from './BonusManagement'
import { NotificationProvider } from './NotificationProvider'
import { AuthProvider } from './AuthProvider'

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          user_id: 'user1',
          employee_name: 'John Doe',
          department: 'Engineering',
          amount: 100000,
          reason: 'Performance bonus',
          date: '2024-01-15',
          status: 'approved'
        },
        {
          _id: '2',
          user_id: 'user2',
          employee_name: 'Jane Smith',
          department: 'Sales',
          amount: 150000,
          reason: 'Sales achievement',
          date: '2024-01-20',
          status: 'pending'
        }
      ]
    }),
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { _id: 'user1', name: 'John Doe', department: 'Engineering' },
        { _id: 'user2', name: 'Jane Smith', department: 'Sales' }
      ]
    }),
    addBonus: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true })
  }
}))

const mockUser = {
  id: 1,
  username: 'admin',
  role: 'admin',
  name: 'Admin User'
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider value={{ user: mockUser, login: vi.fn(), logout: vi.fn() }}>
      <NotificationProvider>
        {component}
      </NotificationProvider>
    </AuthProvider>
  )
}

describe('BonusManagement Migration', () => {
  it('should not use MUI components', async () => {
    renderWithProviders(<BonusManagement yearMonth="2024-01" />)
    
    // ✅ Check that no MUI classes are present
    const muiClasses = [
      '[class*="MuiBox"]',
      '[class*="MuiCard"]',
      '[class*="MuiCardContent"]',
      '[class*="MuiTypography"]',
      '[class*="MuiButton"]',
      '[class*="MuiDialog"]',
      '[class*="MuiDialogTitle"]',
      '[class*="MuiDialogContent"]',
      '[class*="MuiDialogActions"]',
      '[class*="MuiTextField"]',
      '[class*="MuiGrid"]',
      '[class*="MuiTable"]',
      '[class*="MuiTableBody"]',
      '[class*="MuiTableCell"]',
      '[class*="MuiTableContainer"]',
      '[class*="MuiTableHead"]',
      '[class*="MuiTableRow"]',
      '[class*="MuiIconButton"]',
      '[class*="MuiChip"]',
      '[class*="MuiPaper"]',
      '[class*="MuiFormControl"]',
      '[class*="MuiInputLabel"]',
      '[class*="MuiSelect"]',
      '[class*="MuiMenuItem"]',
      '[class*="MuiAlert"]',
      '[class*="MuiTooltip"]',
      '[class*="MuiStack"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = renderWithProviders(<BonusManagement yearMonth="2024-01" />)
    
    // ✅ Should have shadcn card structure
    const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should display bonus management title', async () => {
    renderWithProviders(<BonusManagement yearMonth="2024-01" />)
    
    // ✅ Should show bonus management title
    expect(screen.getByText(/성과급 관리/i)).toBeInTheDocument()
  })
})