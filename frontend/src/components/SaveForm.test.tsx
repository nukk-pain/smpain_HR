import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveForm } from './SaveForm'
import { Toaster } from '@/components/ui/toaster'

describe('SaveForm', () => {
  it('should replace Snackbar with the hook-based Toast', async () => {
    const user = userEvent.setup()
    
    render(
      <>
        <SaveForm />
        <Toaster />
      </>
    )
    
    // Should have a save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeInTheDocument()
    
    // Click the save button to trigger the toast
    await user.click(saveButton)
    
    // Should display success toast message
    const successMessage = await screen.findByText('Success!')
    expect(successMessage).toBeInTheDocument()
  })
})