# Frontend 빌드 최적화 계획

## 현재 상황 분석
- **빌드 시간**: 1분 52초
- **모듈 수**: 14,753개 (너무 많음!)
- **총 번들 크기**: 약 3MB
- **주요 병목**: 
  - AG-Grid: 630KB
  - MUI-X: 501KB  
  - MUI-Core: 415KB
  - Charting: 321KB

## 🚨 즉시 수정 필요 사항

### 1. AG-Grid 버전 충돌 해결 (30% 개선 예상)
```json
// 문제: 두 개 버전 혼용
"@ag-grid-community/core": "^32.3.5",  // 구버전
"ag-grid-community": "^34.0.0",         // 신버전

// 해결: 버전 통일
"@ag-grid-community/core": "^34.0.0",
"@ag-grid-community/client-side-row-model": "^34.0.0",
"@ag-grid-community/csv-export": "^34.0.0",
"@ag-grid-community/styles": "^34.0.0",
```

### 2. MUI 아이콘 최적화 (20% 개선 예상)
```typescript
// ❌ 현재: 전체 패키지 import
import { Save, Delete, Edit } from '@mui/icons-material';

// ✅ 개선: 개별 import
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
```

## ⚡ 빠른 개선 방법 (10분 이내 적용)

### 1. Vite 설정 최적화
```typescript
// vite.config.ts 수정
export default defineConfig({
  build: {
    // CPU 코어 활용
    rollupOptions: {
      maxParallelFileOps: 10,  // 병렬 처리
    },
    
    // 소스맵 비활성화 (이미 설정됨)
    sourcemap: false,
    
    // 청킹 임계값 증가
    chunkSizeWarningLimit: 2000,
  },
  
  // 의존성 사전 번들링 확장
  optimizeDeps: {
    include: [
      // 기존 항목들...
      '@mui/x-data-grid',
      'ag-grid-react',
      'recharts',
      '@tanstack/react-query'
    ],
    force: true  // 강제 재번들링
  }
});
```

### 2. TypeScript 설정 최적화
```json
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,  // 타입 체크 건너뛰기
    "incremental": true,   // 증분 빌드 활성화
    "tsBuildInfoFile": ".tsbuildinfo"  // 캐시 파일
  }
}
```

## 🚀 고급 최적화 (30분 소요)

### 1. SWC 플러그인 적용 (40% 속도 개선)
```bash
npm install -D @vitejs/plugin-react-swc
```

```typescript
// vite.config.ts
import reactSwc from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    reactSwc(),  // react() 대신 사용
    // ...
  ]
});
```

### 2. 동적 import 활용
```typescript
// 큰 컴포넌트 lazy loading
const PayrollGrid = lazy(() => import('./components/PayrollGrid'));
const UnifiedDashboard = lazy(() => import('./components/UnifiedDashboard'));

// Suspense와 함께 사용
<Suspense fallback={<CircularProgress />}>
  <PayrollGrid />
</Suspense>
```

### 3. 번들 분석 및 tree-shaking
```bash
# 번들 크기 분석
npm run build
# dist/stats.html 자동 열림 (이미 설정됨)

# 불필요한 패키지 제거
npm uninstall <unused-package>
```

## 📊 측정 가능한 개선 목표

| 메트릭 | 현재 | 목표 | 개선율 |
|-------|------|------|--------|
| 빌드 시간 | 112초 | 45초 | -60% |
| 모듈 수 | 14,753 | 8,000 | -45% |
| 번들 크기 | 3MB | 2.2MB | -25% |
| 최대 청크 | 630KB | 400KB | -35% |

## 즉시 실행 가능한 명령어

```bash
# 1. AG-Grid 버전 통일
npm uninstall @ag-grid-community/core @ag-grid-community/client-side-row-model @ag-grid-community/csv-export @ag-grid-community/styles
npm install @ag-grid-community/core@34.0.0 @ag-grid-community/client-side-row-model@34.0.0 @ag-grid-community/csv-export@34.0.0 @ag-grid-community/styles@34.0.0

# 2. SWC 설치
npm install -D @vitejs/plugin-react-swc

# 3. 캐시 클리어 후 재빌드
rm -rf node_modules/.vite
npm run build

# 4. 번들 분석
npm run build  # stats.html 자동 열림
```

## 추가 고려사항

### 병렬 빌드 (CI/CD)
```json
// package.json
{
  "scripts": {
    "build:parallel": "npm-run-all --parallel build:*",
    "build:app": "vite build",
    "build:workers": "vite build --config vite.worker.config.ts"
  }
}
```

### 캐싱 전략
- GitHub Actions 캐싱
- node_modules 캐싱
- Vite 빌드 캐싱

## 예상 결과
이러한 최적화를 적용하면:
- **개발 빌드**: 30초 이내
- **프로덕션 빌드**: 45초 이내
- **HMR 응답**: 200ms 이내

## 우선순위
1. 🔴 AG-Grid 버전 통일 (즉시)
2. 🟡 SWC 적용 (10분)
3. 🟡 MUI 아이콘 최적화 (30분)
4. 🟢 동적 import (1시간)
5. 🟢 불필요한 패키지 제거 (2시간)