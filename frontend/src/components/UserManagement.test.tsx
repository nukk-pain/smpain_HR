import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UserManagement from './UserManagement'
import { NotificationProvider } from '../components/NotificationProvider'

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          department: 'Engineering',
          isActive: true
        }
      ]
    }),
    getDepartments: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { _id: '1', name: 'Engineering' },
        { _id: '2', name: 'Sales' },
        { _id: '3', name: 'HR' }
      ]
    }),
    getPositions: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { _id: '1', name: 'Manager', departmentId: '1' },
        { _id: '2', name: 'Developer', departmentId: '1' }
      ]
    }),
    createUser: vi.fn().mockResolvedValue({ success: true }),
    updateUser: vi.fn().mockResolvedValue({ success: true }),
    deleteUser: vi.fn().mockResolvedValue({ success: true }),
    exportUsers: vi.fn().mockResolvedValue({ success: true }),
    importUsers: vi.fn().mockResolvedValue({ success: true }),
    bulkDeleteUsers: vi.fn().mockResolvedValue({ success: true })
  }
}))

// Mock ag-grid-react
vi.mock('ag-grid-react', () => ({
  AgGridReact: () => <div data-testid="ag-grid">Mocked AG Grid</div>
}))

// Mock papaparse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
    unparse: vi.fn()
  }
}))

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('UserManagement Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<UserManagement />)
    
    // Wait for component to load
    await screen.findByText('User Management')
    
    // ❌ Should NOT have MUI classes
    const muiClasses = [
      'MuiBox-root',
      'MuiButton-root',
      'MuiTextField-root',
      'MuiDialog-root',
      'MuiFormControl-root',
      'MuiSelect-root',
      'MuiGrid-root',
      'MuiTypography-root',
      'MuiChip-root',
      'MuiIconButton-root',
      'MuiTooltip-root',
      'MuiAlert-root',
      'MuiCircularProgress-root',
      'MuiCard-root',
      'MuiCardContent-root',
      'MuiCheckbox-root',
      'MuiFormControlLabel-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<UserManagement />)
    
    // Wait for component to load
    await screen.findByText('User Management')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('Add User')
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
  })

  it('should not use ag-theme-material', async () => {
    const { container } = renderWithProvider(<UserManagement />)
    
    // Wait for component to load
    await screen.findByText('User Management')
    
    // ❌ Should NOT use ag-theme-material class
    const materialTheme = container.querySelector('.ag-theme-material')
    expect(materialTheme).toBeNull()
    
    // ✅ Should use ag-theme-alpine instead
    const alpineTheme = container.querySelector('.ag-theme-alpine')
    expect(alpineTheme).not.toBeNull()
  })

  it('should display user management interface', async () => {
    renderWithProvider(<UserManagement />)
    
    // ✅ Should show user management title
    expect(await screen.findByText('User Management')).toBeInTheDocument()
    
    // ✅ Should show search input
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
    
    // ✅ Should show action buttons
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })
})