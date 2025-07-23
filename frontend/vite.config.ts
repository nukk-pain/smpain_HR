/// <reference types="vitest" />
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
  
  server: {
    port: 3727,
    proxy: {
      '/api': {
        target: 'http://localhost:5455',
        changeOrigin: true,
        secure: false,
      }
    },
    // Performance optimization for development
    hmr: {
      overlay: false
    }
  },
  
  // Performance optimizations
  build: {
    outDir: 'dist',
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          routing: ['react-router-dom'],
          utils: ['date-fns', 'axios'],
          
          // Feature-based chunks
          payroll: [
            './src/components/PayrollGrid.tsx',
            './src/components/PayrollDashboard.tsx',
            './src/pages/PayrollManagement.tsx'
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
  
  // Preview server configuration
  preview: {
    port: 3727,
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
    ]
  },
  
  // CSS optimization
  css: {
    devSourcemap: false // Disable CSS source maps in development for better performance
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  }
})