import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import FileUpload from './FileUpload'

// Mock NotificationProvider
vi.mock('./NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn()
  })
}))

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    uploadPayrollFile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        uploadId: 'test-upload-id',
        totalRows: 100,
        validRows: 95,
        invalidRows: 5,
        summary: {
          processed: 95,
          errors: 5
        }
      }
    }),
    getUploadPreview: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          name: 'John Doe',
          salary: 50000,
          department: 'IT'
        }
      ]
    }),
    compareUploadData: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total: 100,
        matches: 90,
        differences: 10,
        newRecords: 5
      }
    }),
    processUpload: vi.fn().mockResolvedValue({
      success: true,
      message: 'Upload processed successfully'
    }),
    downloadComparisonReport: vi.fn().mockResolvedValue({
      success: true,
      data: 'report-data'
    }),
    downloadPayrollTemplate: vi.fn().mockResolvedValue({
      success: true,
      data: 'template-data'
    })
  }
}))

// Mock file reader
global.FileReader = vi.fn(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  onload: vi.fn(),
  onerror: vi.fn(),
  result: null
})) as any

describe('FileUpload Migration', () => {
  it('should not use MUI components', async () => {
    render(<FileUpload />)
    
    // ✅ Check that no MUI classes are present
    await waitFor(() => {
      const muiClasses = [
        '[class*="MuiBox"]',
        '[class*="MuiCard"]',
        '[class*="MuiCardContent"]',
        '[class*="MuiTypography"]',
        '[class*="MuiButton"]',
        '[class*="MuiLinearProgress"]',
        '[class*="MuiAlert"]',
        '[class*="MuiDialog"]',
        '[class*="MuiTextField"]',
        '[class*="MuiGrid"]',
        '[class*="MuiChip"]',
        '[class*="MuiTable"]',
        '[class*="MuiPaper"]',
        '[class*="MuiIconButton"]',
        '[class*="MuiTooltip"]'
      ]
      
      muiClasses.forEach(selector => {
        const element = document.querySelector(selector)
        expect(element).toBeNull()
      })
    })
  })

  it('should display file upload interface', async () => {
    render(<FileUpload />)
    
    // ✅ Should show file upload heading
    await waitFor(() => {
      expect(screen.getByText(/급여 파일 업로드/i)).toBeInTheDocument()
    })
  })

  it('should show upload actions', async () => {
    render(<FileUpload />)
    
    // ✅ Should show upload and template download buttons
    await waitFor(() => {
      expect(screen.getByText(/파일 선택/i)).toBeInTheDocument()
      expect(screen.getByText(/템플릿 다운로드/i)).toBeInTheDocument()
    })
  })

  it('should handle file upload', async () => {
    render(<FileUpload />)
    
    // ✅ Should have file input
    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
    })
  })

  it('should use shadcn/ui card components', async () => {
    const { container } = render(<FileUpload />)
    
    // ✅ Should have shadcn card structure
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})