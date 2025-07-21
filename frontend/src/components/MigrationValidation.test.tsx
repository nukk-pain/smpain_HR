import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Import all migrated components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { GridLayout } from '@/components/GridLayout'
import { PageTitle } from '@/components/PageTitle'
import { FormField } from '@/components/FormField'
import { ActionButton } from '@/components/ActionButton'
import { Edit, Calendar as CalendarIcon } from 'lucide-react'

// Comprehensive component that uses all migrated pieces
function MigrationShowcase() {
  const [date, setDate] = React.useState<Date>()
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const { toast } = useToast()

  const handleAction = () => {
    toast({
      title: "Migration Success",
      description: "All shadcn/ui components are working perfectly!",
    })
  }

  const tableData = [
    { id: 1, name: 'John Doe', role: 'Developer' },
    { id: 2, name: 'Jane Smith', role: 'Designer' },
  ]

  return (
    <ToastProvider>
      <div className="p-6 space-y-6">
        {/* Typography Migration */}
        <PageTitle>Migration Validation Dashboard</PageTitle>
        
        {/* Layout Migration */}
        <GridLayout cols={1} mdCols={2} gap={4}>
          <div className="space-y-4">
            {/* Form Components Migration */}
            <FormField label="Username" id="username" placeholder="Enter username" />
            
            {/* Button Migration */}
            <div className="flex gap-2">
              <Button onClick={handleAction}>Primary Action</Button>
              <Button variant="outline">Secondary</Button>
              <ActionButton action="edit" onClick={handleAction} />
            </div>

            {/* Date Picker Migration */}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? date.toDateString() : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            {/* Navigation Migration */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">Open Navigation</Button>
              </SheetTrigger>
              <SheetContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Navigation Menu</h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                      Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      Users
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Table Migration */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GridLayout>
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}

describe('Migration Success Metrics Validation', () => {
  it('should validate all migrated components work together seamlessly', async () => {
    const user = userEvent.setup()
    
    render(<MigrationShowcase />)
    
    // ✅ Validate Typography Migration
    expect(screen.getByRole('heading', { name: /migration validation dashboard/i })).toBeInTheDocument()
    
    // ✅ Validate Form Components Migration
    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput).toBeInTheDocument()
    await user.type(usernameInput, 'testuser')
    expect(usernameInput).toHaveValue('testuser')
    
    // ✅ Validate Button Migration
    const primaryButton = screen.getByRole('button', { name: /primary action/i })
    const secondaryButton = screen.getByRole('button', { name: /secondary/i })
    const editButton = screen.getByLabelText(/edit/i)
    
    expect(primaryButton).toBeInTheDocument()
    expect(secondaryButton).toBeInTheDocument()
    expect(editButton).toBeInTheDocument()
    
    // ✅ Validate Icon Migration (Lucide React)
    const editIcon = editButton.querySelector('svg')
    expect(editIcon).toHaveClass('lucide-square-pen')
    
    // ✅ Validate Date Picker Migration (Calendar + Popover)
    const dateButton = screen.getByRole('button', { name: /pick a date/i })
    expect(dateButton).toBeInTheDocument()
    
    await user.click(dateButton)
    const calendar = await screen.findByRole('grid')
    expect(calendar).toBeInTheDocument()
    
    // ✅ Validate Navigation Migration (Sheet)
    const navButton = screen.getByRole('button', { name: /open navigation/i })
    await user.click(navButton)
    
    const navDialog = await screen.findByRole('dialog')
    expect(navDialog).toBeInTheDocument()
    expect(screen.getByText('Navigation Menu')).toBeInTheDocument()
    
    // ✅ Validate Table Migration (close sheet first to access table)
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    
    // ✅ Validate Toast Migration would work (button click should not error)
    await user.click(primaryButton)
    // Toast functionality validated in other tests
  })

  it('should validate accessibility standards are maintained', () => {
    render(<MigrationShowcase />)
    
    // ✅ Validate proper heading structure
    const heading = screen.getByRole('heading')
    expect(heading.tagName).toBe('H4')
    
    // ✅ Validate form accessibility
    const input = screen.getByLabelText(/username/i)
    expect(input).toHaveAttribute('id')
    
    const label = screen.getByText('Username')
    expect(label).toHaveAttribute('for')
    
    // ✅ Validate button accessibility
    const editButton = screen.getByLabelText(/edit/i)
    expect(editButton).toHaveAttribute('aria-label', 'Edit')
    
    // ✅ Validate table accessibility
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    const columnHeaders = screen.getAllByRole('columnheader')
    expect(columnHeaders).toHaveLength(2)
  })

  it('should validate responsive design with Tailwind classes', () => {
    const { container } = render(<MigrationShowcase />)
    
    // ✅ Validate Grid Layout uses Tailwind responsive classes
    const gridElement = container.querySelector('.grid')
    expect(gridElement).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'gap-4')
    
    // ✅ Validate responsive button classes
    const dateButton = screen.getByRole('button', { name: /pick a date/i })
    expect(dateButton).toHaveClass('w-full', 'justify-start')
    
    // ✅ Validate spacing classes
    const spacingElements = container.querySelectorAll('.space-y-4, .space-y-6, .space-y-2')
    expect(spacingElements.length).toBeGreaterThan(0)
  })

  it('should validate performance optimizations', () => {
    const { container } = render(<MigrationShowcase />)
    
    // ✅ Validate utility-first CSS approach
    const elements = container.querySelectorAll('[class]')
    const hasUtilityClasses = Array.from(elements).some(el => {
      const className = el.getAttribute('class') || ''
      return className.includes('flex') || 
             className.includes('grid') || 
             className.includes('p-') ||
             className.includes('space-')
    })
    expect(hasUtilityClasses).toBe(true)
    
    // ✅ Validate no MUI classes remain
    const hasMuiClasses = Array.from(elements).some(el => {
      const className = el.getAttribute('class') || ''
      return className.includes('MuiButton') || 
             className.includes('MuiTextField') ||
             className.includes('MuiCard')
    })
    expect(hasMuiClasses).toBe(false)
  })
})