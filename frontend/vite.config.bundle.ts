/**
 * Vite Configuration for Bundle Size Optimization
 * 
 * Configures code splitting, chunk optimization, and bundle analysis
 * for the UserManagement system components.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer plugin for development
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'treemap', 'sunburst', 'network'
    }),
  ],
  
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            'react',
            'react-dom',
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          
          // User management core components
          'user-management-core': [
            './src/components/UserManagementContainer.tsx',
            './src/hooks/useUserFilters.ts',
            './src/hooks/useUserPermissions.ts'
          ],
          
          // User management forms and dialogs
          'user-management-forms': [
            './src/components/UserForm.tsx',
            './src/components/UserDetails.tsx',
            './src/hooks/useUserForm.ts'
          ],
          
          // User management lists and actions
          'user-management-ui': [
            './src/components/UserList.tsx',
            './src/components/UserActions.tsx',
            './src/components/UserFilters.tsx'
          ],
          
          // Performance utilities
          'performance-utils': [
            './src/utils/performanceOptimizations.ts'
          ]
        },
        
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `chunks/${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset names
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        // Entry file naming
        entryFileNames: 'entries/[name]-[hash].js',
      },
      
      // External dependencies (if needed)
      external: [],
    },
    
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Optimize CSS
    cssCodeSplit: true,
    
    // Source maps for production debugging
    sourcemap: true,
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Remove specific console methods
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500, // KB
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4KB limit for inlining assets
  },
  
  // Development optimizations
  server: {
    fs: {
      allow: ['..']
    }
  },
  
  // Preview optimizations
  preview: {
    port: 3727,
    open: true
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    }
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material'
    ],
    exclude: []
  },
  
  // Environment configuration
  define: {
    __BUNDLE_ANALYSIS__: JSON.stringify(process.env.NODE_ENV === 'development'),
  }
});