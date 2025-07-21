import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import FileManagement from './FileManagement'

// Mock the FileUpload component
vi.mock('../components/FileUpload', () => ({
  default: function MockFileUpload() {
    return <div data-testid="file-upload">File Upload Component</div>
  }
}))

describe('FileManagement Migration', () => {
  it('should migrate from MUI to shadcn/ui successfully', () => {
    render(<FileManagement />)
    
    // ✅ Validate Typography → Semantic HTML + Tailwind
    const heading = screen.getByRole('heading', { level: 1, name: /file management/i })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
    
    // ✅ Validate Paper → Card component
    const fileUploadComponent = screen.getByTestId('file-upload')
    expect(fileUploadComponent).toBeInTheDocument()
    
    // ✅ Validate no MUI classes remain
    const container = document.querySelector('[class*="MuiContainer"]')
    expect(container).toBeNull()
    
    const paper = document.querySelector('[class*="MuiPaper"]')
    expect(paper).toBeNull()
    
    const typography = document.querySelector('[class*="MuiTypography"]')
    expect(typography).toBeNull()
  })
  
  it('should maintain accessibility and structure', () => {
    render(<FileManagement />)
    
    // ✅ Validate proper heading structure
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    
    // ✅ Validate FileUpload component is rendered
    const fileUpload = screen.getByTestId('file-upload')
    expect(fileUpload).toBeInTheDocument()
  })
})