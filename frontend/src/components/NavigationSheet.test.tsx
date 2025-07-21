import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavigationSheet } from './NavigationSheet'

describe('NavigationSheet', () => {
  it('should open Sheet on button click', async () => {
    const user = userEvent.setup()
    
    render(<NavigationSheet />)
    
    // Should have a trigger button
    const menuButton = screen.getByRole('button', { name: /menu/i })
    expect(menuButton).toBeInTheDocument()
    
    // Click the button to open the sheet
    await user.click(menuButton)
    
    // Should open a dialog (Sheet component uses dialog role)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })
})