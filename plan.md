# 3단계: 프론트엔드 Vercel 배포 상세 계획

## 개요
백엔드 Cloud Run 배포가 완료된 상태에서 React TypeScript 프론트엔드를 Vercel에 배포합니다. GitHub 연동을 통한 자동 배포와 백엔드 API 연결을 구성합니다.

## 사전 준비 사항

### 1. Vercel 계정 및 프로젝트 설정
- [ ] Vercel 계정 생성 (vercel.com)
- [ ] GitHub 저장소 연결
- [ ] Vercel CLI 설치: `npm i -g vercel`

### 2. 백엔드 API URL 확인
```bash
# Cloud Run 서비스 URL 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(status.url)"

# 예시: https://hr-backend-xxxxx-an.a.run.app
```

## 프론트엔드 최적화

### 1. 빌드 설정 최적화
현재 `frontend/vite.config.ts` 확인 및 개선:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 빌드 최적화
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // 벤더 라이브러리 분리
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          utils: ['axios', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  
  // 개발 서버 설정
  server: {
    port: 3727,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  
  // 환경변수 처리
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL)
  }
})
```

### 2. 환경변수 설정
환경별 API URL 구성:

```bash
# frontend/.env.development
VITE_API_URL=http://localhost:8080
VITE_NODE_ENV=development

# frontend/.env.production (Vercel에서 설정)
VITE_API_URL=https://hr-backend-xxxxx-an.a.run.app
VITE_NODE_ENV=production

# frontend/.env.preview (Vercel Preview 배포용)
VITE_API_URL=https://hr-backend-staging-xxxxx-an.a.run.app
VITE_NODE_ENV=staging
```

### 3. API 클라이언트 구성 개선
```typescript
// frontend/src/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Axios 인스턴스 설정
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  withCredentials: true, // 세션 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  }
});

// 요청/응답 인터셉터
apiClient.interceptors.request.use((config) => {
  // 개발 환경에서 로깅
  if (import.meta.env.DEV) {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Vercel 배포 설정

### 1. vercel.json 설정 파일 생성
```json
{
  "version": 2,
  "name": "hr-frontend",
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"
    }
  ],
  "functions": {
    "frontend/dist/index.html": {
      "includeFiles": "frontend/dist/**"
    }
  },
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. 빌드 스크립트 설정
```json
// frontend/package.json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:check": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "vercel-build": "npm run build"
  }
}
```

### 3. TypeScript 설정 확인
```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## CORS 및 보안 설정

### 1. 백엔드 CORS 설정 업데이트
```javascript
// backend/middleware/errorHandler.js
const corsOptions = {
  origin: [
    'http://localhost:3727', // 로컬 개발
    'https://hr-frontend.vercel.app', // Vercel 프로덕션
    'https://hr-frontend-git-main.vercel.app', // Vercel Git 브랜치
    /^https:\/\/hr-frontend-.*\.vercel\.app$/ // Vercel Preview 배포
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};
```

### 2. 세션 쿠키 설정 개선
```javascript
// backend/server.js
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 크로스 도메인 허용
  },
  name: 'hr.sessionId'
};
```

## Vercel 프로젝트 설정

### 1. GitHub 연결 및 자동 배포
```bash
# Vercel CLI로 프로젝트 연결
cd frontend
vercel login
vercel link

# 환경변수 설정
vercel env add VITE_API_URL production
# 값: https://hr-backend-xxxxx-an.a.run.app

vercel env add VITE_NODE_ENV production
# 값: production
```

### 2. 브랜치별 배포 설정
- **main 브랜치**: 프로덕션 배포 (hr-frontend.vercel.app)
- **develop 브랜치**: 스테이징 배포 (자동 Preview URL)
- **feature 브랜치**: Preview 배포 (PR당 고유 URL)

### 3. 빌드 설정 (Vercel Dashboard)
```bash
# Build Command
npm run build

# Output Directory  
dist

# Install Command
npm install

# Development Command
npm run dev
```

## 성능 최적화

### 1. 코드 분할 및 지연 로딩
```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';

// 페이지별 코드 분할
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const PayrollManagement = lazy(() => import('./pages/PayrollManagement'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/payroll" element={<PayrollManagement />} />
          <Route path="/leave" element={<LeaveManagement />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### 2. 이미지 최적화
```typescript
// next/image 스타일 최적화 (Vercel 권장)
const OptimizedImage = ({ src, alt, ...props }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    decoding="async"
    {...props}
  />
);
```

### 3. 번들 크기 최적화
```typescript
// 불필요한 Material-UI 컴포넌트 제거
import Button from '@mui/material/Button'; // ✅ 개별 import
import { Button } from '@mui/material'; // ❌ 전체 import 지양

// Tree shaking을 위한 ES6 import 사용
import { format } from 'date-fns/format'; // ✅
import * as dateFns from 'date-fns'; // ❌
```

## 환경별 배포 전략

### 1. 프로덕션 배포 (main 브랜치)
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run TypeScript check
        run: |
          cd frontend
          npm run build:check
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
          vercel-args: '--prod'
```

### 2. 스테이징 배포 (develop 브랜치)
```bash
# Vercel Preview 배포 (자동)
# develop 푸시 시 자동으로 Preview URL 생성
# 환경변수: VITE_API_URL을 스테이징 백엔드로 설정
```

### 3. Preview 배포 (PR)
```bash
# Pull Request 시 자동 Preview 배포
# 각 PR마다 고유한 URL 생성
# 코드 리뷰 시 실제 동작 테스트 가능
```

## 도메인 및 SSL 설정

### 1. 커스텀 도메인 설정 (선택사항)
```bash
# Vercel Dashboard에서 도메인 추가
# 예: hr.yourcompany.com

# DNS 설정
# CNAME: hr -> cname.vercel-dns.com
```

### 2. SSL 인증서
- Vercel이 자동으로 Let's Encrypt SSL 인증서 발급
- 커스텀 도메인에도 자동 적용

## 모니터링 및 분석

### 1. Vercel Analytics 설정
```typescript
// frontend/src/main.tsx
import { inject } from '@vercel/analytics';

// 프로덕션 환경에서만 활성화
if (import.meta.env.PROD) {
  inject();
}
```

### 2. 성능 모니터링
```typescript
// Web Vitals 측정
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // 분석 서비스로 전송
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3. 오류 추적
```typescript
// Sentry 또는 LogRocket 연동 (선택사항)
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_NODE_ENV
  });
}
```

## 테스트 및 검증

### 1. 로컬 프로덕션 빌드 테스트
```bash
cd frontend

# 프로덕션 빌드
npm run build

# 로컬에서 프로덕션 빌드 실행
npm run preview

# 또는 Vercel CLI로 로컬 테스트
vercel dev
```

### 2. API 연결 테스트
```bash
# 백엔드 API가 실행 중인 상태에서
# 프론트엔드에서 API 호출 테스트

# 로그인 테스트
curl -X POST https://hr-frontend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 3. 크로스 브라우저 테스트
- Chrome, Firefox, Safari, Edge
- 모바일 브라우저 (iOS Safari, Android Chrome)
- 다양한 해상도 테스트

## 일정

### Week 1: 프론트엔드 최적화 및 설정
- **Day 1-2**: Vite 설정 최적화, 환경변수 구성
- **Day 3**: API 클라이언트 개선, CORS 설정
- **Day 4-5**: 코드 분할, 성능 최적화

### Week 2: Vercel 배포 및 연동
- **Day 1-2**: Vercel 프로젝트 설정, GitHub 연동
- **Day 3**: 백엔드-프론트엔드 연결 테스트
- **Day 4-5**: 환경별 배포 설정, 도메인 구성

### Week 3: 테스트 및 최적화
- **Day 1-2**: 전체 기능 테스트, 버그 수정
- **Day 3**: 성능 최적화, 모니터링 설정
- **Day 4-5**: 문서화, 배포 자동화 완성

## 성공 기준

### 기능적 요구사항
- ✓ 모든 페이지가 Vercel에서 정상 로드
- ✓ 백엔드 API와 완전한 연동
- ✓ 로그인/세션 관리 정상 작동
- ✓ 파일 업로드/다운로드 기능 작동

### 성능 요구사항
- ✓ First Contentful Paint < 1.5초
- ✓ Largest Contentful Paint < 2.5초
- ✓ Time to Interactive < 3초
- ✓ Cumulative Layout Shift < 0.1

### 배포 요구사항
- ✓ GitHub 푸시 시 자동 배포
- ✓ PR별 Preview 배포 생성
- ✓ 환경별 설정 분리
- ✓ SSL 인증서 적용

## 리스크 및 대응방안

### 1. CORS 문제
- **문제**: 크로스 도메인 요청 차단
- **해결**: 
  - 백엔드 CORS 설정에 Vercel 도메인 추가
  - 쿠키 설정 (sameSite, secure) 조정

### 2. 세션 관리 문제  
- **문제**: 도메인이 다른 환경에서 세션 유지 실패
- **해결**:
  - SameSite=None, Secure=true 설정
  - 세션 만료 시간 조정

### 3. 빌드 시간 증가
- **문제**: 의존성 증가로 빌드 시간 지연
- **해결**:
  - 의존성 최적화
  - Vercel 빌드 캐시 활용

### 4. 환경변수 노출
- **문제**: 클라이언트 사이드에서 환경변수 노출
- **해결**:
  - VITE_ 접두사 사용으로 의도적 노출만 허용
  - 민감한 정보는 백엔드에서만 관리

## 롤백 계획

### 즉시 롤백 (문제 발생 시)
1. Vercel Dashboard에서 이전 배포로 롤백
2. DNS 설정을 이전 서버로 임시 변경
3. 문제 분석 및 수정

### 완전 롤백 (심각한 문제 시)
1. 로컬 개발 서버로 임시 서비스
2. 기존 호스팅 환경 재구성
3. 점진적 문제 해결 후 재배포

## 체크리스트

### 배포 전 준비사항
- [ ] Vite 설정 최적화 완료
- [ ] 환경변수 설정 완료
- [ ] 백엔드 CORS 설정 업데이트
- [ ] Vercel 프로젝트 생성 및 연결

### 배포 단계
- [ ] GitHub 저장소 연결 완료
- [ ] 자동 배포 테스트 통과
- [ ] Preview 배포 기능 확인
- [ ] 프로덕션 배포 성공

### 배포 후 확인사항
- [ ] 모든 페이지 정상 로드 확인
- [ ] API 연결 및 기능 테스트 통과
- [ ] 성능 메트릭 목표 달성
- [ ] 모니터링 시스템 작동 확인

## 예상 비용
- **Vercel Pro 플랜**: $20/월 (팀 기능, 커스텀 도메인)
- **대역폭**: 100GB/월 무료 (초과 시 $40/TB)
- **빌드 시간**: 6,000분/월 무료
- **총 예상 비용**: $0-20/월 (트래픽에 따라)

이 계획을 따라하면 HR 프론트엔드를 Vercel에 성공적으로 배포하고 백엔드와 완전히 연동할 수 있습니다.