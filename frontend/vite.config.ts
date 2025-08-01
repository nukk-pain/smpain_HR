import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    server: {
      port: 3727,
      // 프록시 대신 직접 API 호출 사용 (CORS 설정이 백엔드에서 처리됨)
      // proxy: {
      //   '/api': {
      //     target: env.VITE_API_URL || 'https://hr-backend-429401177957.asia-northeast3.run.app',
      //     changeOrigin: true,
      //     secure: true,
      //   }
      // },
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
            // Framework chunks (separated for better caching)
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-core': ['@mui/material', '@mui/system'],
            'mui-icons': ['@mui/icons-material'],
            
            // Utility chunks
            'date-utils': ['date-fns'],
            'http-client': ['axios'],
            
            // MUI DataGrid (lighter alternative to AG-Grid)
            'mui-data-grid': ['@mui/x-data-grid'],
            
            // Feature-specific chunks (more granular)
            'payroll-core': [
              './src/components/PayrollDashboard.tsx',
              './src/components/IncentiveCalculator.tsx'
            ],
            'payroll-grid': ['./src/components/PayrollGrid.tsx'],
            'payroll-pages': ['./src/pages/PayrollManagement.tsx'],
            
            // User management features
            'user-management': [
              './src/components/UserManagement.tsx',
              './src/pages/UserManagementPage.tsx'
            ],
            
            // Leave management features
            'leave-management': [
              './src/pages/LeaveManagement.tsx',
              './src/pages/EmployeeLeaveManagement.tsx',
              './src/components/TeamLeaveStatus.tsx'
            ],
            
            // File management
            'file-management': [
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
          drop_console: true, // 프로덕션에서 console.log 제거
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