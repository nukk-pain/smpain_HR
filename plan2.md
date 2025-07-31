# 2단계: 백엔드 Google Cloud Run 배포 상세 계획

## 개요
MongoDB Atlas 연결이 완료된 백엔드 애플리케이션을 Google Cloud Run에 배포합니다. 서버리스 컨테이너 환경으로 전환하여 자동 확장과 비용 효율성을 확보합니다.

## 사전 준비 사항

### 1. Google Cloud 계정 및 프로젝트 설정
- [ ] Google Cloud Platform 계정 생성
- [ ] 새 프로젝트 생성: `hr-management-system`
- [ ] 필요한 API 활성화:
  - Cloud Run API
  - Cloud Build API
  - Container Registry API
  - Secret Manager API

### 2. 개발 환경 준비
- [ ] Docker Desktop 설치 및 실행
- [ ] Google Cloud SDK 설치
- [ ] gcloud 인증 설정

## 백엔드 컨테이너화

### 1. Dockerfile 최적화
```dockerfile
# 멀티스테이지 빌드로 이미지 크기 최소화
FROM node:18-alpine AS builder
# 프로덕션 의존성만 설치

FROM node:18-alpine AS production
# 보안을 위한 non-root 사용자
# Health check 설정
# Signal 처리를 위한 dumb-init
```

**주요 최적화 포인트:**
- Alpine Linux 베이스 이미지로 크기 최소화
- 멀티스테이지 빌드로 불필요한 파일 제거
- Non-root 사용자로 보안 강화
- Health check 엔드포인트 포함

### 2. 환경변수 관리 개선
현재 `.env` 파일 기반에서 Cloud Run 환경변수로 전환:

```bash
# 현재 (.env.development)
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=hr-development-secret-2025
PORT=5455

# Cloud Run 환경변수로 전환
MONGODB_URI → Secret Manager
SESSION_SECRET → Secret Manager  
PORT → Cloud Run 자동 설정 (8080)
```

### 3. Health Check 엔드포인트 추가
```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => process.exit(1));
request.end();
```

### 4. 서버 코드 수정사항
- [ ] PORT 환경변수를 8080으로 기본 설정
- [ ] `/health` 엔드포인트 추가
- [ ] Graceful shutdown 처리 개선
- [ ] 파일 업로드 경로를 임시 디렉토리로 변경

## Cloud Build 설정

### 1. cloudbuild.yaml 생성
```yaml
steps:
  # Docker 이미지 빌드
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/hr-backend:$BUILD_ID', './backend']
  
  # Container Registry에 푸시
  - name: 'gcr.io/cloud-builders/docker'  
    args: ['push', 'gcr.io/$PROJECT_ID/hr-backend:$BUILD_ID']
  
  # Cloud Run에 배포
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
    - 'run'
    - 'deploy'
    - 'hr-backend'
    - '--image'
    - 'gcr.io/$PROJECT_ID/hr-backend:$BUILD_ID'
    - '--region'
    - 'asia-northeast3'
    - '--platform'
    - 'managed'
```

### 2. Secret Manager 설정
```bash
# MongoDB 연결 문자열 저장
gcloud secrets create mongodb-uri --data-file=-

# 세션 시크릿 저장  
gcloud secrets create session-secret --data-file=-

# Cloud Run에서 시크릿 사용 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 배포 설정

### 1. Cloud Run 서비스 구성
```bash
gcloud run deploy hr-backend \
  --image gcr.io/PROJECT_ID/hr-backend:TAG \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,SESSION_SECRET=session-secret:latest" \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=300 \
  --max-instances=10
```

### 2. 네트워크 및 보안 설정
- [ ] MongoDB Atlas IP 화이트리스트에 Cloud Run IP 추가
- [ ] CORS 설정에 프론트엔드 도메인 추가
- [ ] HTTPS만 허용하도록 설정

## 로컬 테스트

### 1. Docker 로컬 빌드 및 실행
```bash
# 이미지 빌드
docker build -t hr-backend ./backend

# 로컬에서 컨테이너 실행
docker run -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e SESSION_SECRET="test-secret" \
  hr-backend
```

### 2. 기능 테스트 체크리스트
- [ ] 서버 시작 및 DB 연결 확인
- [ ] Health check 엔드포인트 응답
- [ ] 로그인 API 테스트
- [ ] 파일 업로드 기능 테스트
- [ ] 세션 유지 확인

## CI/CD 파이프라인 구성

### 1. GitHub Actions 워크플로우
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]
    paths: [ 'backend/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        
      - name: Build and Deploy
        run: gcloud builds submit --config cloudbuild.yaml
```

### 2. 브랜치 전략
- `main` 브랜치: 프로덕션 배포
- `develop` 브랜치: 스테이징 환경 (추후 구성)
- Feature 브랜치: 개발 작업

## 모니터링 및 로깅

### 1. Cloud Run 모니터링 설정
- [ ] 요청 수, 응답 시간, 오류율 모니터링
- [ ] 메모리 및 CPU 사용률 추적
- [ ] 알림 설정 (오류율 5% 초과시)

### 2. 로깅 개선
```javascript
// 구조화된 로깅
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  message: 'User login successful',
  userId: user.id,
  ip: req.ip
};
console.log(JSON.stringify(log));
```

## 비용 최적화

### 1. Cloud Run 설정 최적화
- 최소 인스턴스: 0 (완전 서버리스)
- 최대 인스턴스: 10 (급격한 비용 증가 방지)
- CPU 할당: 요청 처리 중에만
- 동시성: 80 (기본값)

### 2. 예상 비용 (월간)
- 요청 100만건: ~$2.40
- CPU 시간: ~$14.40
- 메모리: ~$1.44
- **총 예상 비용: ~$18/월** (트래픽이 적은 초기 단계)

## 일정

### Week 1: 컨테이너화 및 로컬 테스트
- **Day 1-2**: Dockerfile 작성 및 최적화
- **Day 3**: Health check 및 환경변수 처리
- **Day 4-5**: 로컬 Docker 테스트 및 디버깅

### Week 2: Cloud 환경 설정 및 배포
- **Day 1-2**: GCP 프로젝트 설정, API 활성화
- **Day 3**: Secret Manager 설정
- **Day 4**: Cloud Build 및 첫 배포
- **Day 5**: 기능 테스트 및 성능 검증

### Week 3: CI/CD 및 최적화
- **Day 1-2**: GitHub Actions 워크플로우 설정
- **Day 3**: 모니터링 및 알림 설정
- **Day 4-5**: 성능 최적화 및 문서화

## 성공 기준

### 기능적 요구사항
- ✓ 모든 API 엔드포인트가 Cloud Run에서 정상 작동
- ✓ MongoDB Atlas 연결 안정성 유지
- ✓ 파일 업로드/다운로드 기능 정상 작동
- ✓ 세션 관리 정상 작동

### 비기능적 요구사항
- ✓ 평균 응답 시간 < 500ms
- ✓ 가용성 > 99.5%
- ✓ 오류율 < 1%
- ✓ Cold start 시간 < 3초

### 운영 요구사항
- ✓ GitHub push 시 자동 배포
- ✓ 장애 알림 시스템 작동
- ✓ 로그 수집 및 분석 가능
- ✓ 비용이 예산 범위 내 유지

## 리스크 및 대응방안

### 1. Cold Start 지연
- **문제**: 첫 요청 시 3-5초 지연
- **해결**: 
  - 이미지 크기 최소화 (Alpine Linux)
  - Cloud Scheduler로 정기적 웜업 요청

### 2. 파일 업로드 제한
- **문제**: 임시 파일 시스템 용량 제한
- **해결**: 
  - Google Cloud Storage 연동 검토
  - 업로드 파일 크기 제한 설정

### 3. 세션 관리
- **문제**: 서버리스 환경에서 인메모리 세션 불가
- **해결**: 
  - MongoDB Atlas 기반 세션 저장소 유지
  - Redis 대안 검토 (필요시)

## 롤백 계획

### 즉시 롤백 (문제 발생 시)
1. 이전 버전으로 Cloud Run 서비스 롤백
2. DNS를 기존 서버로 임시 변경
3. 문제 분석 및 수정

### 완전 롤백 (심각한 문제 시)
1. 로컬 서버 환경 재구성
2. MongoDB Atlas 연결 유지
3. 점진적 문제 해결 후 재배포

## 체크리스트

### 배포 전 준비사항
- [ ] Google Cloud 프로젝트 및 API 설정 완료
- [ ] Dockerfile 및 관련 파일 작성
- [ ] 로컬 Docker 테스트 통과
- [ ] Secret Manager에 환경변수 설정

### 배포 단계
- [ ] Cloud Build로 이미지 빌드 성공
- [ ] Cloud Run 서비스 배포 완료
- [ ] Health check 엔드포인트 정상 응답
- [ ] 모든 API 기능 테스트 통과

### 배포 후 확인사항
- [ ] 모니터링 대시보드 설정
- [ ] 알림 시스템 작동 확인
- [ ] CI/CD 파이프라인 테스트
- [ ] 성능 및 비용 모니터링 시작