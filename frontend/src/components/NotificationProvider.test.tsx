import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationProvider, useNotification } from './NotificationProvider'

// Test component to trigger notifications
const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification()
  
  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error message')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info message')}>
        Show Info
      </button>
    </div>
  )
}

describe('NotificationProvider Migration', () => {
  it('should migrate from MUI Snackbar/Alert to shadcn/ui toast successfully', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )
    
    // ✅ Trigger a success notification
    const successButton = screen.getByRole('button', { name: /show success/i })
    fireEvent.click(successButton)
    
    // ✅ Validate no MUI classes remain
    await waitFor(() => {
      const snackbar = document.querySelector('[class*="MuiSnackbar"]')
      expect(snackbar).toBeNull()
      
      const alert = document.querySelector('[class*="MuiAlert"]')
      expect(alert).toBeNull()
    }, { timeout: 1000 })
    
    // ✅ Validate toast notification appears
    await waitFor(() => {
      const notification = screen.getByText(/성공/i)
      expect(notification).toBeInTheDocument()
      
      const message = screen.getByText(/success message/i)
      expect(message).toBeInTheDocument()
    }, { timeout: 1000 })
  })
  
  it('should show different notification types', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )
    
    // ✅ Test error notification
    const errorButton = screen.getByRole('button', { name: /show error/i })
    fireEvent.click(errorButton)
    
    await waitFor(() => {
      const errorTitle = screen.getByText(/오류/i)
      expect(errorTitle).toBeInTheDocument()
      
      const errorMessage = screen.getByText(/error message/i)
      expect(errorMessage).toBeInTheDocument()
    }, { timeout: 1000 })
  })
  
  it('should maintain notification functionality', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )
    
    // ✅ All notification buttons should be present and functional
    expect(screen.getByRole('button', { name: /show success/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show error/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show warning/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show info/i })).toBeInTheDocument()
  })
})