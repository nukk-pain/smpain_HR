import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateSelector } from './DateSelector'

describe('DateSelector', () => {
  it('should open a Calendar in a Popover', async () => {
    const user = userEvent.setup()
    
    render(<DateSelector />)
    
    // Should have a button to trigger the date picker
    const dateButton = screen.getByRole('button', { name: /pick a date/i })
    expect(dateButton).toBeInTheDocument()
    
    // Click the button to open the calendar
    await user.click(dateButton)
    
    // Should open a calendar (with role="grid")
    const calendar = await screen.findByRole('grid')
    expect(calendar).toBeInTheDocument()
  })
})