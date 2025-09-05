import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc' // SWC 사용
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      // SWC로 변경 (40% 빌드 속도 개선)
      react(),
      
      // 번들 분석 (개발 시에만)
      mode === 'development' && visualizer({
        filename: 'dist/stats.html',
        open: false, // 자동으로 열지 않음
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    
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
      
      // 병렬 처리 최적화
      rollupOptions: {
        maxParallelFileOps: 10, // CPU 코어 활용
        
        output: {
          // 단순화된 청킹 전략 - 순환 참조 문제 해결
          manualChunks(id) {
            // node_modules 최적화
            if (id.includes('node_modules')) {
              // React 관련
              if (id.includes('react')) {
                if (id.includes('react-router')) return 'react-router';
                return 'react-vendor';
              }
              
              // MUI 관련 (통합)
              if (id.includes('@mui')) {
                if (id.includes('icons-material')) return 'mui-icons';
                if (id.includes('x-data-grid')) return 'mui-datagrid';
                if (id.includes('x-date-pickers')) return 'mui-datepicker';
                return 'mui-core';
              }
              
              // AG-Grid 관련 (통합)
              if (id.includes('ag-grid')) {
                return 'ag-grid';
              }
              
              // 차트 라이브러리
              if (id.includes('recharts')) return 'charting';
              
              // 유틸리티
              if (id.includes('date-fns')) return 'date-utils';
              if (id.includes('lodash')) return 'lodash';
              if (id.includes('axios')) return 'http-client';
              
              // 기타 vendor - 더 구체적으로 분류
              if (id.includes('pdf') || id.includes('jspdf')) return 'pdf-libs';
              if (id.includes('exceljs') || id.includes('xlsx')) return 'excel-libs';
              if (id.includes('emotion') || id.includes('styled')) return 'styling';
              
              // 나머지
              return 'vendor-misc';
            }
            
            // 소스 코드는 청킹하지 않음 (순환 참조 방지)
            return undefined;
          },
          
          // 청크 파일명 최적화
          chunkFileNames: 'assets/[name]-[hash].js',
          
          // 더 작은 청크 크기
          experimentalMinChunkSize: 10000, // 10KB
        }
      },

      // 빌드 최적화
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
          passes: 2, // 압축 최적화
        },
        format: {
          comments: false, // 주석 제거
        }
      },

      // 소스맵 비활성화 (프로덕션)
      sourcemap: mode === 'development' ? 'inline' : false,

      // 청크 크기 경고 증가
      chunkSizeWarningLimit: 2000,
      
      // 리포팅 최적화
      reportCompressedSize: false, // gzip 크기 계산 비활성화
    },

    preview: {
      port: 3727,
      strictPort: true
    },

    // 의존성 사전 번들링 최적화
    optimizeDeps: {
      include: [
        // 핵심 라이브러리 사전 번들링
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/x-data-grid',
        '@mui/x-date-pickers',
        '@tanstack/react-query',
        'ag-grid-react',
        'ag-grid-community',
        'recharts',
        'axios',
        'date-fns',
        'lodash-es'
      ],
      
      // 캐싱 강제
      force: mode === 'production',
      
      // esbuild 최적화
      esbuildOptions: {
        target: 'es2020',
        supported: { 
          'top-level-await': true 
        },
      }
    },

    // CSS 최적화
    css: {
      devSourcemap: false,
      
      // PostCSS 최적화
      postcss: {
        plugins: mode === 'production' ? [
          // CSS 압축 플러그인 추가 가능
        ] : []
      },
      
      // CSS 모듈 최적화
      modules: {
        generateScopedName: mode === 'production' 
          ? '[hash:base64:5]' 
          : '[name]__[local]__[hash:base64:5]'
      }
    },
    
    // 워커 최적화
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/worker-[name]-[hash].js'
        }
      }
    },
    
    // 로거 최적화
    customLogger: {
      ...console,
      // 불필요한 로그 제거
      info: () => {},
      warn: (msg) => {
        // 특정 경고 무시
        if (msg.includes('vite:css') || msg.includes('sourcemap')) return;
        console.warn(msg);
      }
    }
  };
});