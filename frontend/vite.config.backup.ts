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
        open: false, // Disable auto-open in production builds
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
            'mui-core': ['@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
            'mui-icons': ['@mui/icons-material'],
            'mui-x': ['@mui/x-data-grid', '@mui/x-date-pickers'],
            
            // Large vendor libraries (separate for better caching)
            'ag-grid-vendor': ['ag-grid-community', 'ag-grid-react', '@ag-grid-community/core', '@ag-grid-community/client-side-row-model', '@ag-grid-community/csv-export', '@ag-grid-community/styles'],
            'charting-vendor': ['recharts'],
            'utility-vendor': ['date-fns', 'lodash-es'],
            'http-client': ['axios'],
            
            // Feature-specific chunks (more granular)
            'payroll-components': [
              './src/components/PayrollDashboard.tsx',
              './src/components/IncentiveCalculator.tsx',
              './src/components/PayrollGrid.tsx',
              './src/components/PayrollDetail.tsx',
              './src/components/PayrollList.tsx',
              './src/components/PayrollPreviewSummary.tsx',
              './src/components/PayrollPreviewTable.tsx'
            ],
            'payroll-excel': [
              './src/components/PayrollExcelUploadWithPreview.tsx',
              './src/components/FileUpload.tsx'
            ],
            'payroll-pages': [
              './src/pages/PayrollManagement.tsx',
              './src/pages/Payroll/PayrollDetail.tsx',
              './src/pages/Payroll/PayrollList.tsx',
              './src/pages/Payroll/PayrollExcelUpload.tsx',
              './src/pages/Payroll/PayslipManagement.tsx'
            ],
            
            // User management features
            'user-components': [
              './src/components/UserManagement.tsx',
              './src/components/UserManagementContainer.tsx',
              './src/components/UserForm.tsx',
              './src/components/UserDetails.tsx',
              './src/components/UserList.tsx',
              './src/components/UserFilters.tsx',
              './src/components/UserActions.tsx',
              './src/components/UserFormSections.tsx'
            ],
            'user-hooks': [
              './src/hooks/useUserForm.ts',
              './src/hooks/useUserFilters.ts',
              './src/hooks/useUserPermissions.ts',
              './src/hooks/useUserManagement.ts'
            ],
            'user-pages': [
              './src/pages/UserManagement.tsx',
              './src/pages/UserManagementPage.tsx',
              './src/pages/UserProfile.tsx'
            ],
            
            // Leave management features
            'leave-components': [
              './src/components/UnifiedLeaveOverview.tsx',
              './src/components/LeaveAdjustmentDialog.tsx',
              './src/components/LeaveCalendar.tsx'
            ],
            'leave-pages': [
              './src/pages/LeaveManagement.tsx',
              './src/pages/EmployeeLeaveManagement.tsx',
              './src/pages/LeaveCalendarPage.tsx',
              './src/pages/UnifiedLeaveOverviewPage.tsx'
            ],
            
            // Admin features
            'admin-components': [
              './src/components/DepartmentManagement.tsx',
              './src/components/PositionManagement.tsx',
              './src/components/BonusManagement.tsx',
              './src/components/SalesManagement.tsx',
              './src/components/DeactivationDialog.tsx'
            ],
            'admin-pages': [
              './src/pages/AdminLeavePolicy.tsx',
              './src/pages/AdminBulkOperations.tsx',
              './src/pages/DepartmentManagementPage.tsx',
              './src/pages/PositionManagementPage.tsx'
            ],
            
            // Dashboard and general features
            'dashboard-components': [
              './src/components/UnifiedDashboard.tsx',
              './src/components/UserDashboard.tsx',
              './src/components/Layout.tsx',
              './src/components/NotificationProvider.tsx'
            ],
            'dashboard-pages': [
              './src/pages/Dashboard.tsx',
              './src/pages/Reports.tsx'
            ]
          }
        }
      },

      // Optimization settings
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Drop console logs in production
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