import { cn } from './utils'

describe('cn utility', () => {
  it('should correctly merge conflicting classes', () => {
    // This test verifies that tailwind-merge correctly resolves conflicts
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('should merge non-conflicting classes', () => {
    expect(cn('p-2', 'bg-red-500', 'text-white')).toBe('p-2 bg-red-500 text-white')
  })

  it('should handle conditional classes', () => {
    expect(cn('p-2', true && 'bg-blue-500', false && 'bg-red-500')).toBe('p-2 bg-blue-500')
  })
})