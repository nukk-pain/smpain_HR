import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Layout from './Layout'

// Mock AuthProvider
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      full_name: 'Test User',
      name: 'Test User',
      role: 'admin',
      avatar_url: null,
      permissions: ['payroll:view', 'payroll:manage', 'leave:view', 'leave:manage', 'users:view']
    },
    logout: vi.fn()
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
    updateProfile: vi.fn().mockResolvedValue({ success: true })
  }
}))

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' })
  }
})

const LayoutWrapper = () => (
  <BrowserRouter>
    <Layout />
  </BrowserRouter>
)

describe('Layout Migration', () => {
  it('should migrate from MUI to shadcn/ui successfully', () => {
    render(<LayoutWrapper />)
    
    // ✅ Validate navigation structure exists (check for multiple instances)
    const dashboardElements = screen.getAllByText(/대시보드/i)
    expect(dashboardElements.length).toBeGreaterThan(0)
    
    // ✅ Validate no MUI classes remain
    const muiComponents = [
      '[class*="MuiAppBar"]',
      '[class*="MuiDrawer"]', 
      '[class*="MuiToolbar"]',
      '[class*="MuiBox"]',
      '[class*="MuiList"]',
      '[class*="MuiButton"]',
      '[class*="MuiAvatar"]',
      '[class*="MuiMenu"]',
      '[class*="MuiDialog"]',
      '[class*="MuiTextField"]',
      '[class*="MuiTypography"]'
    ]
    
    muiComponents.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })
  
  it('should show main navigation items', () => {
    render(<LayoutWrapper />)
    
    // ✅ Core navigation items should be present
    expect(screen.getAllByText(/대시보드/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/직원 관리/i)).toBeInTheDocument()
    expect(screen.getByText(/급여 관리/i)).toBeInTheDocument()
    expect(screen.getByText(/내 휴가 관리/i)).toBeInTheDocument()
  })
  
  it('should show user profile section', () => {
    render(<LayoutWrapper />)
    
    // ✅ User profile elements should be present
    expect(screen.getByText(/test user/i)).toBeInTheDocument()
  })
  
  it('should handle navigation menu toggle', () => {
    render(<LayoutWrapper />)
    
    // ✅ Menu toggle button should be present
    const menuButton = screen.getByRole('button', { name: /menu/i })
    expect(menuButton).toBeInTheDocument()
    
    // ✅ Should be able to click menu toggle
    fireEvent.click(menuButton)
  })
  
  it('should maintain responsive layout structure', () => {
    render(<LayoutWrapper />)
    
    // ✅ Should have main content area for Outlet
    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })
})