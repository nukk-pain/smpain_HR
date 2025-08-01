# Vite Bundle 최적화 계획

## 현재 문제점
- payroll-DQ0GgAXj.js: 1,065.79 kB (gzip: 291.77 kB) - 1MB 초과
- AG-Grid 라이브러리가 주요 원인
- 초기 로딩 시간 증가 및 사용자 경험 저하

## 최적화 목표
- 각 청크를 500KB 이하로 감소
- 초기 로딩 시간 30% 이상 단축
- Lazy loading을 통한 필요시 로딩

## Phase 1: AG-Grid 최적화 (우선순위: 높음)
**예상 시간**: 2-3시간
**예상 절약**: 600-700KB

### Step 1.1: AG-Grid 필요 모듈만 Import
```typescript
// 현재: 전체 AG-Grid 로드
import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'

// 최적화: 필요한 모듈만 선별 import
import { ModuleRegistry } from '@ag-grid-community/core'
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { CsvExportModule } from '@ag-grid-community/csv-export'
```

### Step 1.2: AG-Grid 대안 검토
- MUI DataGrid 사용 검토 (훨씬 가벼움)
- React-Table v8 (TanStack Table) 검토
- 필요한 기능만 구현한 커스텀 테이블

## Phase 2: Manual Chunk 설정 개선 (우선순위: 높음)
**예상 시간**: 1-2시간
**예상 절약**: 200-300KB

### Step 2.1: 세분화된 청킹
```typescript
manualChunks: {
  // Framework chunks
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'mui-core': ['@mui/material', '@mui/system'],
  'mui-icons': ['@mui/icons-material'],
  'mui-lab': ['@mui/lab', '@mui/x-date-pickers'],
  
  // Utility chunks
  'date-utils': ['date-fns'],
  'http-client': ['axios'],
  
  // Feature-specific chunks
  'ag-grid': ['ag-grid-react', 'ag-grid-community'],
  'payroll-core': [
    './src/components/PayrollDashboard.tsx',
    './src/components/PayrollGrid.tsx'
  ],
  'payroll-pages': ['./src/pages/PayrollManagement.tsx'],
  
  // Management features
  'user-management': [
    './src/components/UserManagement.tsx',
    './src/pages/UserManagementPage.tsx'
  ],
  'leave-management': [
    './src/pages/LeaveManagement.tsx',
    './src/pages/EmployeeLeaveManagement.tsx'
  ]
}
```

### Step 2.2: Dynamic Import 확장
```typescript
// 추가 컴포넌트들을 lazy loading으로 변경
const UserManagement = React.lazy(() => import('./pages/UserManagementPage'))
const LeaveManagement = React.lazy(() => import('./pages/LeaveManagement'))
const Reports = React.lazy(() => import('./pages/Reports'))
```

## Phase 3: 고급 최적화 (우선순위: 중간)
**예상 시간**: 2-3시간
**예상 절약**: 100-200KB

### Step 3.1: Tree Shaking 최적화
```typescript
// Date-fns에서 필요한 함수만 import
import { format, subMonths, addMonths } from 'date-fns'
// 전체 import 금지: import * as dateFns from 'date-fns'

// MUI에서 개별 컴포넌트 import
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
// 전체 import 최소화: import { Button, TextField } from '@mui/material'
```

### Step 3.2: Bundle Analyzer 도구 사용
```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  react(),
  visualizer({
    filename: 'dist/stats.html',
    open: true,
    gzipSize: true
  })
]
```

### Step 3.3: 불필요한 라이브러리 제거
- 사용하지 않는 MUI 컴포넌트 확인
- 중복된 기능의 라이브러리 통합
- 개발 의존성이 프로덕션에 포함되지 않았는지 확인

## Phase 4: 성능 모니터링 (우선순위: 낮음)
**예상 시간**: 1시간

### Step 4.1: 성능 메트릭 설정
```typescript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page Load Time:', entry.loadEventEnd - entry.loadEventStart)
    }
  }
})
observer.observe({ entryTypes: ['navigation'] })
```

### Step 4.2: Lighthouse 점수 개선
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Total Blocking Time (TBT) < 200ms

## 구현 순서
1. **Phase 1 실행** - AG-Grid 최적화 (가장 큰 효과)
2. **Phase 2 실행** - Manual Chunk 개선
3. **성능 측정** - Before/After 비교
4. **Phase 3 실행** - 추가 최적화 (필요시)
5. **Phase 4 실행** - 모니터링 설정

## 성공 기준
- [ ] 모든 청크가 500KB 이하
- [ ] payroll 청크가 600KB 이하로 감소
- [ ] 초기 로딩 시간 30% 이상 단축
- [ ] Lighthouse Performance 점수 90+ 달성

## 예상 결과
- **현재**: payroll 청크 1,065KB
- **목표**: payroll 청크 500KB 이하
- **절약**: ~50% 크기 감소
- **로딩 시간**: 2-3초 → 1-2초 단축

## 위험 요소 및 대응
1. **AG-Grid 기능 손실**: 
   - 대안: MUI DataGrid나 커스텀 테이블로 교체
2. **Dynamic Import 오류**:
   - 대안: Suspense 에러 바운더리 추가
3. **과도한 청킹으로 인한 HTTP 요청 증가**:
   - 대안: 적절한 청크 크기 균형 조정

## 롤백 계획
- 각 Phase별 git commit으로 버전 관리
- 성능 저하 시 이전 단계로 롤백
- 기능 테스트 통과 후 다음 단계 진행