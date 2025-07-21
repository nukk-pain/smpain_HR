import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PositionManagement from './PositionManagement'
import { NotificationProvider } from './NotificationProvider'

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    getPositions: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: '1',
          title: 'Software Engineer',
          description: 'Develop and maintain software applications',
          level: 3,
          department: 'Engineering',
          responsibilities: ['Code development', 'Code reviews', 'Testing'],
          requirements: ['Bachelor degree', '3+ years experience'],
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          _id: '2',
          title: 'Product Manager',
          description: 'Manage product development lifecycle',
          level: 4,
          department: 'Product',
          responsibilities: ['Product planning', 'Stakeholder management'],
          requirements: ['MBA preferred', '5+ years experience'],
          createdAt: '2024-01-02T00:00:00.000Z'
        }
      ]
    }),
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

describe('PositionManagement Migration', () => {
  it('should not use MUI components', async () => {
    renderWithProvider(<PositionManagement />)
    
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
      '[class*="MuiList"]',
      '[class*="MuiListItem"]',
      '[class*="MuiListItemText"]',
      '[class*="MuiListItemIcon"]',
      '[class*="MuiDivider"]',
      '[class*="MuiChip"]',
      '[class*="MuiCircularProgress"]',
      '[class*="MuiAlert"]',
      '[class*="MuiPaper"]'
    ]
    
    muiClasses.forEach(selector => {
      const element = document.querySelector(selector)
      expect(element).toBeNull()
    })
  })

  it('should use shadcn/ui components', async () => {
    const { container } = renderWithProvider(<PositionManagement />)
    
    // Wait for data to load
    await screen.findByText(/Position Management/i)
    
    // ✅ Should have shadcn card structure
    const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should display position management interface', async () => {
    renderWithProvider(<PositionManagement />)
    
    // ✅ Should show position management title (wait for it to load)
    expect(await screen.findByText(/Position Management/i)).toBeInTheDocument()
  })
})