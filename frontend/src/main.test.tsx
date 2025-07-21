import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Main Migration', () => {
  it('should not import MUI ThemeProvider or CssBaseline', () => {
    // ✅ Read the main.tsx file content
    const mainPath = resolve(__dirname, 'main.tsx')
    const mainContent = readFileSync(mainPath, 'utf-8')
    
    // ✅ Validate no MUI imports remain
    expect(mainContent).not.toContain('@mui/material/styles')
    expect(mainContent).not.toContain('ThemeProvider')
    expect(mainContent).not.toContain('CssBaseline')
    expect(mainContent).not.toContain('createTheme')
  })
  
  it('should maintain essential imports', () => {
    const mainPath = resolve(__dirname, 'main.tsx')
    const mainContent = readFileSync(mainPath, 'utf-8')
    
    // ✅ Should still have essential imports
    expect(mainContent).toContain('react-router-dom')
    expect(mainContent).toContain('BrowserRouter')
    expect(mainContent).toContain('./App.tsx')
    expect(mainContent).toContain('./globals.css')
  })
  
  it('should maintain AG Grid registration', () => {
    const mainPath = resolve(__dirname, 'main.tsx')
    const mainContent = readFileSync(mainPath, 'utf-8')
    
    // ✅ Should still register AG Grid modules
    expect(mainContent).toContain('ag-grid-community')
    expect(mainContent).toContain('ModuleRegistry.registerModules')
  })
})