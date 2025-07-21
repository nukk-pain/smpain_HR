import { describe, it, expect } from 'vitest'
import packageJson from '../../package.json'

describe('MUI Migration Cleanup', () => {
  it('should not have any MUI dependencies', () => {
    const dependencies = packageJson.dependencies
    
    // Check that MUI dependencies are removed
    expect(dependencies).not.toHaveProperty('@mui/material')
    expect(dependencies).not.toHaveProperty('@mui/icons-material')
    expect(dependencies).not.toHaveProperty('@mui/x-date-pickers')
    expect(dependencies).not.toHaveProperty('@emotion/react')
    expect(dependencies).not.toHaveProperty('@emotion/styled')
  })

  it('should have shadcn/ui related dependencies', () => {
    const dependencies = packageJson.dependencies
    
    // Check that we have the required shadcn/ui dependencies
    expect(dependencies).toHaveProperty('lucide-react')
    expect(dependencies).toHaveProperty('class-variance-authority')
    expect(dependencies).toHaveProperty('clsx')
    expect(dependencies).toHaveProperty('tailwind-merge')
  })
})