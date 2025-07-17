import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  // Performance optimizations
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          routing: ['react-router-dom'],
          forms: ['react-hook-form'],
          utils: ['date-fns', 'axios'],
          
          // Feature-based chunks
          payroll: [
            './src/components/PayrollGrid.tsx',
            './src/components/PayrollDashboard.tsx',
            './src/pages/PayrollManagement.tsx'
          ],
          sales: [
            './src/components/SalesManagement.tsx',
            './src/components/IncentiveCalculator.tsx'
          ],
          user: [
            './src/components/UserManagement.tsx',
            './src/pages/UserManagementPage.tsx'
          ],
          file: [
            './src/components/FileUpload.tsx',
            './src/pages/FileManagement.tsx'
          ]
        }
      }
    },
    
    // Optimization settings
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    
    // Source map configuration
    sourcemap: false, // Disable source maps in production for better performance
    
    // Bundle size optimization
    chunkSizeWarningLimit: 1000, // Warn if chunks exceed 1MB
  },
  
  // Development server optimizations
  server: {
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true
  },
  
  // Dependency pre-bundling optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'date-fns'
    ],
    exclude: [
      // Exclude dev dependencies
    ]
  },
  
  // CSS optimization
  css: {
    devSourcemap: false // Disable CSS source maps in development for better performance
  }
})