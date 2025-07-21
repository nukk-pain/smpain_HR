import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import UserProfile from './UserProfile'
import { NotificationProvider } from '../components/NotificationProvider'
import { AuthProvider } from '../components/AuthProvider'

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    updateUserProfile: vi.fn().mockResolvedValue({ success: true })
  }
}))

const mockUser = {
  _id: '1',
  id: 1,
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  department: 'Engineering',
  position: 'Software Engineer',
  birthDate: '1990-01-01',
  phoneNumber: '123-456-7890',
  hireDate: '2020-01-01',
  employeeId: 'EMP001',
  contractType: 'regular',
  yearsOfService: 4,
  annualLeave: 15
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider value={{ user: mockUser, refreshUser: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <NotificationProvider>
        {component}
      </NotificationProvider>
    </AuthProvider>
  )
}

describe('UserProfile Migration', () => {
  it('should not use MUI components', async () => {
    renderWithProviders(<UserProfile />)
    
    // ✅ Check that no MUI classes are present
    const muiClasses = [
      '[class*="MuiBox"]',
      '[class*="MuiCard"]',
      '[class*="MuiCardContent"]',
      '[class*="MuiTypography"]',
      '[class*="MuiButton"]',
      '[class*="MuiTextField"]',
      '[class*="MuiGrid"]',
      '[class*="MuiAvatar"]',
      '[class*="MuiDivider"]',
      '[class*="MuiAlert"]',
      '[class*="MuiCircularProgress"]',
      '[class*="MuiFormControl"]',
      '[class*="MuiInputLabel"]',
      '[class*="MuiSelect"]',
      '[class*="MuiMenuItem"]',
      '[class*="MuiChip"]',
      '[class*="MuiPaper"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = renderWithProviders(<UserProfile />)
    
    // ✅ Should have shadcn loading state (Loader2 with animate-spin)
    const loading = container.querySelector('[class*="animate-spin"]')
    expect(loading).toBeTruthy()
    
    // ✅ Should have migrated layout structure
    const loadingContainer = container.querySelector('[class*="flex"][class*="justify-center"][class*="items-center"]')
    expect(loadingContainer).toBeTruthy()
  })

  it('should display loading state properly', async () => {
    renderWithProviders(<UserProfile />)
    
    // ✅ Should show loading spinner
    const loadingSpinner = document.querySelector('[class*="animate-spin"]')
    expect(loadingSpinner).toBeInTheDocument()
  })
})