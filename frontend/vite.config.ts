import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
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
      hmr: {
        overlay: false
      }
    },

    build: {
      outDir: 'dist',
      
      rollupOptions: {
        output: {
          // 매우 단순한 청킹 전략
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui': ['@mui/material', '@mui/x-data-grid', '@mui/x-date-pickers'],
            'ag-grid': ['ag-grid-react', 'ag-grid-community'],
          }
        }
      },

      // 빌드 최적화
      target: 'es2020',
      minify: 'esbuild', // terser 대신 esbuild 사용 (더 빠름)
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      reportCompressedSize: false,
    },

    preview: {
      port: 3727,
      strictPort: true
    },

    // 의존성 사전 번들링
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/x-data-grid',
        '@mui/x-date-pickers',
        'ag-grid-react',
        'ag-grid-community',
        'axios',
        'date-fns',
      ],
    },
  };
});