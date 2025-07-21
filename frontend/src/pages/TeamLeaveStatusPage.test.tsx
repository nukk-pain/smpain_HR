import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import TeamLeaveStatusPage from './TeamLeaveStatusPage'

// Mock the TeamLeaveStatus component
vi.mock('../components/TeamLeaveStatus', () => ({
  default: function MockTeamLeaveStatus({ viewMode }: { viewMode: 'team' | 'department' }) {
    return <div data-testid="team-leave-status">Team Leave Status - {viewMode}</div>
  }
}))

describe('TeamLeaveStatusPage Migration', () => {
  it('should migrate from MUI to shadcn/ui successfully', () => {
    render(<TeamLeaveStatusPage />)
    
    // ✅ Validate ToggleButtonGroup → Button group with Tailwind
    const teamButton = screen.getByRole('button', { name: /팀 현황/i })
    expect(teamButton).toBeInTheDocument()
    
    const departmentButton = screen.getByRole('button', { name: /부서 통계/i })
    expect(departmentButton).toBeInTheDocument()
    
    // ✅ Validate TeamLeaveStatus component is rendered
    const teamLeaveStatus = screen.getByTestId('team-leave-status')
    expect(teamLeaveStatus).toBeInTheDocument()
    expect(teamLeaveStatus).toHaveTextContent('Team Leave Status - team')
    
    // ✅ Validate no MUI classes remain
    const toggleGroup = document.querySelector('[class*="MuiToggleButtonGroup"]')
    expect(toggleGroup).toBeNull()
    
    const toggleButton = document.querySelector('[class*="MuiToggleButton"]')
    expect(toggleButton).toBeNull()
    
    const box = document.querySelector('[class*="MuiBox"]')
    expect(box).toBeNull()
  })
  
  it('should maintain toggle functionality', () => {
    render(<TeamLeaveStatusPage />)
    
    // ✅ Initial state should be 'team'
    const teamLeaveStatus = screen.getByTestId('team-leave-status')
    expect(teamLeaveStatus).toHaveTextContent('Team Leave Status - team')
    
    // ✅ Click department button to switch view
    const departmentButton = screen.getByRole('button', { name: /부서 통계/i })
    fireEvent.click(departmentButton)
    
    expect(teamLeaveStatus).toHaveTextContent('Team Leave Status - department')
  })
  
  it('should maintain accessibility', () => {
    render(<TeamLeaveStatusPage />)
    
    // ✅ Validate button accessibility
    const teamButton = screen.getByRole('button', { name: /팀 현황/i })
    expect(teamButton).toBeInTheDocument()
    
    const departmentButton = screen.getByRole('button', { name: /부서 통계/i })
    expect(departmentButton).toBeInTheDocument()
  })
})