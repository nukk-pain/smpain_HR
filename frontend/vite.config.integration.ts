import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Integration test configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      // Set test API URL
      VITE_API_URL: 'http://localhost:5455/api'
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:5455/api')
  }
})