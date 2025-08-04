import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../components/AuthProvider'
import App from '../App'

// Mock the Dashboard and UserProfile components
jest.mock('../pages/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard-page">Dashboard</div>
  }
})

jest.mock('../pages/UserProfile', () => {
  return function MockUserProfile() {
    return <div data-testid="profile-page">User Profile</div>
  }
})

// Mock other heavy components to avoid lazy loading issues in tests
jest.mock('../pages/PayrollManagement', () => {
  return function MockPayrollManagement() {
    return <div>PayrollManagement</div>
  }
})

jest.mock('../pages/LeaveManagement', () => {
  return function MockLeaveManagement() {
    return <div>LeaveManagement</div>
  }
})

jest.mock('../pages/EmployeeLeaveManagement', () => {
  return function MockEmployeeLeaveManagement() {
    return <div>EmployeeLeaveManagement</div>
  }
})

jest.mock('../pages/LeaveCalendarPage', () => {
  return function MockLeaveCalendarPage() {
    return <div>LeaveCalendarPage</div>
  }
})

jest.mock('../pages/TeamLeaveStatusPage', () => {
  return function MockTeamLeaveStatusPage() {
    return <div>TeamLeaveStatusPage</div>
  }
})

jest.mock('../pages/UserManagementPage', () => {
  return function MockUserManagementPage() {
    return <div>UserManagementPage</div>
  }
})

jest.mock('../pages/DepartmentManagementPage', () => {
  return function MockDepartmentManagementPage() {
    return <div>DepartmentManagementPage</div>
  }
})

jest.mock('../pages/Reports', () => {
  return function MockReports() {
    return <div>Reports</div>
  }
})

jest.mock('../pages/FileManagement', () => {
  return function MockFileManagement() {
    return <div>FileManagement</div>
  }
})

jest.mock('../pages/AdminLeaveOverview', () => {
  return function MockAdminLeaveOverview() {
    return <div>AdminLeaveOverview</div>
  }
})

jest.mock('../pages/AdminLeavePolicy', () => {
  return function MockAdminLeavePolicy() {
    return <div>AdminLeavePolicy</div>
  }
})

// Mock the AuthProvider hook
const mockAuthProvider = (user: { role: string } | null, isAuthenticated: boolean = true) => {
  return ({ children }: { children: React.ReactNode }) => (
    <div>
      <div data-testid="auth-context" style={{ display: 'none' }}>
        {JSON.stringify({ user, isAuthenticated, loading: false })}
      </div>
      {children}
    </div>
  )
}

describe('Route Configuration Tests', () => {
  describe('Test 1: 공용 페이지 라우트 설정', () => {
    it('should allow all authenticated users to access /dashboard', async () => {
      const roles = ['user', 'supervisor', 'admin']
      
      for (const role of roles) {
        const MockedAuthProvider = mockAuthProvider({ role }, true)
        
        render(
          <MemoryRouter initialEntries={['/dashboard']}>
            <MockedAuthProvider>
              <App />
            </MockedAuthProvider>
          </MemoryRouter>
        )
        
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
        screen.unmount?.()
      }
    })

    it('should allow all authenticated users to access /profile', async () => {
      const roles = ['user', 'supervisor', 'admin']
      
      for (const role of roles) {
        const MockedAuthProvider = mockAuthProvider({ role }, true)
        
        render(
          <MemoryRouter initialEntries={['/profile']}>
            <MockedAuthProvider>
              <App />
            </MockedAuthProvider>
          </MemoryRouter>
        )
        
        expect(screen.getByTestId('profile-page')).toBeInTheDocument()
        screen.unmount?.()
      }
    })

    it('should redirect unauthenticated users from /dashboard to /login', () => {
      const MockedAuthProvider = mockAuthProvider(null, false)
      
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <MockedAuthProvider>
            <App />
          </MockedAuthProvider>
        </MemoryRouter>
      )
      
      // Should not show dashboard content for unauthenticated users
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument()
    })

    it('should redirect unauthenticated users from /profile to /login', () => {
      const MockedAuthProvider = mockAuthProvider(null, false)
      
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <MockedAuthProvider>
            <App />
          </MockedAuthProvider>
        </MemoryRouter>
      )
      
      // Should not show profile content for unauthenticated users
      expect(screen.queryByTestId('profile-page')).not.toBeInTheDocument()
    })
  })
})