# Vercel Frontend 배포 가이드

## 개요
HR 관리 시스템 프론트엔드를 Vercel에 배포하는 방법을 설명합니다.

## 1. Vercel 프로젝트 설정

### 1.1 Vercel 대시보드에서 새 프로젝트 생성
1. https://vercel.com/dashboard 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결: `HR` 저장소 선택
4. 프로젝트 설정:
   - **Project Name**: `hr-frontend`
   - **Framework Preset**: Other (자동 감지 비활성화)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 1.2 환경변수 설정
Vercel 대시보드 > Settings > Environment Variables에서 설정:

#### Production 환경변수
```bash
VITE_API_URL=https://hr-backend-xxxxx-an.a.run.app
VITE_NODE_ENV=production
VITE_APP_NAME=HR Management System
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
VITE_ENABLE_LOGGING=false
```

#### Preview 환경변수 (선택사항)
```bash
VITE_API_URL=https://hr-backend-staging-xxxxx-an.a.run.app
VITE_NODE_ENV=staging
VITE_DEBUG=true
```

## 2. 로컬에서 Vercel CLI로 배포

### 2.1 Vercel CLI 설치 및 로그인
```bash
npm install -g vercel
vercel login
```

### 2.2 프로젝트 링크
```bash
cd frontend
vercel link
# 기존 프로젝트 선택 또는 새 프로젝트 생성
```

### 2.3 환경변수 설정 (CLI)
```bash
# 프로덕션 환경변수 설정
vercel env add VITE_API_URL production
# 값 입력: https://hr-backend-xxxxx-an.a.run.app

vercel env add VITE_NODE_ENV production
# 값 입력: production

# Preview 환경변수 설정
vercel env add VITE_API_URL preview
# 값 입력: https://hr-backend-staging-xxxxx-an.a.run.app
```

### 2.4 배포 실행
```bash
# Preview 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 3. GitHub Actions 자동 배포 설정

### 3.1 GitHub Secrets 설정
Repository Settings > Secrets and variables > Actions에서 추가:

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id  
VERCEL_PROJECT_ID=your_project_id
```

**토큰 획득 방법:**
1. Vercel Dashboard > Settings > Tokens
2. "Create Token" 클릭
3. 토큰명: `github-actions`
4. Scope: Full Account
5. 생성된 토큰을 GitHub Secrets에 추가

**ORG_ID, PROJECT_ID 획득:**
```bash
cd frontend
vercel link
cat .vercel/project.json
```

### 3.2 자동 배포 워크플로우
`.github/workflows/deploy-frontend.yml` 파일이 자동으로 다음을 수행:

- **main 브랜치 푸시**: 프로덕션 배포
- **develop 브랜치 푸시**: Preview 배포  
- **Pull Request**: Preview 배포 + 댓글로 URL 알림

## 4. 커스텀 도메인 설정 (선택사항)

### 4.1 도메인 추가
1. Vercel Dashboard > Project > Settings > Domains
2. "Add Domain" 클릭
3. 도메인 입력: `hr.yourcompany.com`

### 4.2 DNS 설정
도메인 등록업체에서 다음 설정:
```bash
# CNAME 레코드
hr -> cname.vercel-dns.com

# 또는 A 레코드 (IPv4)
hr -> 76.76.19.19

# AAAA 레코드 (IPv6)  
hr -> 2606:4700:90:0:f22e:fbec:5bed:a9b9
```

## 5. 배포 후 확인사항

### 5.1 기능 테스트 체크리스트
- [ ] 로그인 페이지 로드 및 인증
- [ ] 대시보드 정상 표시
- [ ] API 호출 및 데이터 표시
- [ ] 파일 업로드/다운로드
- [ ] 세션 유지 확인
- [ ] 모바일 반응형 디자인

### 5.2 성능 확인
```bash
# Lighthouse 점수 확인 (목표)
Performance: > 90
Accessibility: > 95
Best Practices: > 90
SEO: > 85
```

### 5.3 네트워크 확인
```bash
# 브라우저 개발자 도구 > Network 탭에서 확인
- API 요청이 올바른 백엔드 URL로 전송되는지
- CORS 에러가 없는지
- 세션 쿠키가 정상 설정되는지
```

## 6. 트러블슈팅

### 6.1 일반적인 문제들

#### 빌드 실패
```bash
# 로컬에서 빌드 테스트
cd frontend
npm run build

# TypeScript 에러 확인
npx tsc --noEmit
```

#### API 연결 실패
```bash
# 환경변수 확인
echo $VITE_API_URL

# 네트워크 테스트
curl https://hr-backend-xxxxx-an.a.run.app/health
```

#### CORS 에러
백엔드 CORS 설정에 Vercel 도메인 추가 확인:
```javascript
// backend/middleware/errorHandler.js
const allowedOrigins = [
  'https://hr-frontend.vercel.app',
  /^https:\/\/hr-frontend-.*\.vercel\.app$/
];
```

### 6.2 배포 로그 확인
```bash
# Vercel CLI로 로그 확인
vercel logs

# 또는 Vercel Dashboard > Functions > View Function Logs
```

### 6.3 환경변수 문제
```bash
# 설정된 환경변수 확인
vercel env ls

# 특정 환경의 환경변수 확인
vercel env ls --environment=production
```

## 7. 성능 최적화

### 7.1 번들 크기 분석
```bash
cd frontend
npm run build

# 번들 분석 (선택적 패키지 설치)
npm install --save-dev vite-bundle-analyzer
npx vite-bundle-analyzer dist
```

### 7.2 캐싱 최적화
`vercel.json`에서 정적 자산 캐싱 설정:
```json
{
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
  ]
}
```

### 7.3 이미지 최적화
```bash
# Vercel 이미지 최적화 (필요시)
# next/image 대신 Vercel Image Optimization API 사용
https://hr-frontend.vercel.app/_vercel/image?url=/logo.png&w=200&q=75
```

## 8. 모니터링 및 분석

### 8.1 Vercel Analytics 설정
```bash
cd frontend
npm install @vercel/analytics

# frontend/src/main.tsx에 추가
import { inject } from '@vercel/analytics';
inject();
```

### 8.2 Web Vitals 모니터링
```typescript
// frontend/src/utils/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Vercel Analytics로 전송
  console.log(metric);
}

export function initWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
```

## 9. 보안 설정

### 9.1 Content Security Policy
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://hr-backend-*.run.app"
        }
      ]
    }
  ]
}
```

### 9.2 HTTPS Redirect
```json
// vercel.json
{
  "redirects": [
    {
      "source": "http://hr.yourcompany.com/(.*)",
      "destination": "https://hr.yourcompany.com/$1",
      "permanent": true
    }
  ]
}
```

## 10. 백업 및 롤백

### 10.1 배포 히스토리 확인
```bash
# Vercel CLI로 배포 목록 확인
vercel ls

# 특정 배포로 롤백 (Vercel Dashboard에서)
# Deployments > 이전 배포 선택 > "Promote to Production"
```

### 10.2 긴급 롤백 절차
1. Vercel Dashboard에서 이전 성공 배포로 롤백
2. GitHub에서 문제 커밋 되돌리기
3. 핫픽스 브랜치 생성 후 수정
4. 테스트 후 다시 배포

이 가이드를 따라하면 HR 프론트엔드를 안전하고 효율적으로 Vercel에 배포할 수 있습니다.