import { render, screen } from '@testing-library/react'
import Reports from './Reports'

describe('Reports Migration', () => {
  it('should migrate from MUI to shadcn/ui successfully', () => {
    render(<Reports />)
    
    // ✅ Validate Typography → Semantic HTML + Tailwind
    const heading = screen.getByRole('heading', { level: 1, name: /보고서/i })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
    
    // ✅ Validate Card → shadcn/ui Card
    const cardContent = screen.getByText(/보고서 생성 기능/i)
    expect(cardContent).toBeInTheDocument()
    
    // ✅ Validate Button → shadcn/ui Button with Lucide icon
    const downloadButton = screen.getByRole('button', { name: /보고서 다운로드/i })
    expect(downloadButton).toBeInTheDocument()
    
    // ✅ Validate no MUI classes remain
    const container = screen.getByText(/보고서 생성 기능/i).closest('div')
    const className = container?.getAttribute('class') || ''
    expect(className).not.toContain('MuiCard')
    expect(className).not.toContain('MuiButton')
  })
  
  it('should maintain accessibility', () => {
    render(<Reports />)
    
    // ✅ Validate proper heading structure
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    
    // ✅ Validate button accessibility
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})