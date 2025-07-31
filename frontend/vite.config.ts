import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
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
          target: env.VITE_API_URL || 'http://localhost:8080',
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
            mui: ['@mui/material', '@mui/icons-material', '@mui/system'],
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
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // 임시로 console.log 유지 (디버깅용)
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
        '@mui/material',
        '@mui/icons-material',
        'react-router-dom',
        'axios',
        'date-fns'
      ]
    },

    // CSS optimization
    css: {
      devSourcemap: false // Disable CSS source maps in development for better performance
    }
  }; // return 문 종료
}); // defineConfig 종료