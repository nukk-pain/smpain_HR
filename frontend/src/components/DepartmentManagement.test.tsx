import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DepartmentManagement from './DepartmentManagement'
import { NotificationProvider } from './NotificationProvider'

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getDepartments: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          name: 'Engineering',
          description: 'Software Development',
          managerId: 'manager1',
          employees: [],
          managers: []
        }
      ]
    }),
    getUsers: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'user1',
          name: 'Test User',
          department: 'Engineering'
        }
      ]
    }),
    getPositions: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          title: 'Senior Developer',
          department: 'Engineering',
          level: 3
        }
      ]
    }),
    getDepartmentEmployees: vi.fn().mockResolvedValue({
      success: true,
      data: {
        _id: '1',
        name: 'Engineering',
        description: 'Software Development',
        employees: [
          {
            _id: 'emp1',
            name: 'Test Employee',
            position: 'Senior Developer'
          }
        ]
      }
    }),
    getOrganizationChart: vi.fn().mockResolvedValue({
      success: true,
      data: {
        departments: [],
        managementHierarchy: [],
        organizationTree: [],
        summary: {
          totalEmployees: 5,
          totalDepartments: 2,
          totalManagers: 2
        }
      }
    }),
    createDepartment: vi.fn().mockResolvedValue({ success: true }),
    updateDepartment: vi.fn().mockResolvedValue({ success: true }),
    deleteDepartment: vi.fn().mockResolvedValue({ success: true }),
    createPosition: vi.fn().mockResolvedValue({ success: true }),
    updatePosition: vi.fn().mockResolvedValue({ success: true }),
    deletePosition: vi.fn().mockResolvedValue({ success: true })
  }
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NotificationProvider>
      {component}
    </NotificationProvider>
  )
}

describe('DepartmentManagement Migration', () => {
  it('should not use MUI components', async () => {
    const { container } = renderWithProvider(<DepartmentManagement />)
    
    // Wait for component to load
    await screen.findByText('Department & Position Management')
    
    // ❌ Should NOT have MUI classes
    const muiClasses = [
      'MuiBox-root',
      'MuiButton-root',
      'MuiCard-root',
      'MuiCardContent-root',
      'MuiTypography-root',
      'MuiGrid-root',
      'MuiList-root',
      'MuiListItem-root',
      'MuiListItemText-root',
      'MuiListItemIcon-root',
      'MuiDivider-root',
      'MuiChip-root',
      'MuiDialog-root',
      'MuiDialogTitle-root',
      'MuiDialogContent-root',
      'MuiDialogActions-root',
      'MuiTextField-root',
      'MuiFormControl-root',
      'MuiInputLabel-root',
      'MuiSelect-root',
      'MuiMenuItem-root',
      'MuiCircularProgress-root',
      'MuiAlert-root',
      'MuiTabs-root',
      'MuiTab-root',
      'MuiIconButton-root',
      'MuiTooltip-root'
    ]
    
    muiClasses.forEach(className => {
      const element = container.querySelector(`.${className}`)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    renderWithProvider(<DepartmentManagement />)
    
    // Wait for component to load
    await screen.findByText('Department & Position Management')
    
    // ✅ Should have shadcn button
    const button = screen.getByText('Add Department')
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
  })

  it('should display department management interface', async () => {
    renderWithProvider(<DepartmentManagement />)
    
    // ✅ Should show department management title
    expect(await screen.findByText('Department & Position Management')).toBeInTheDocument()
    
    // ✅ Should show action buttons
    expect(screen.getByText('Add Department')).toBeInTheDocument()
    
    // ✅ Should show tabs for different views
    expect(screen.getByRole('tab', { name: /departments/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /positions/i })).toBeInTheDocument()
  })
})