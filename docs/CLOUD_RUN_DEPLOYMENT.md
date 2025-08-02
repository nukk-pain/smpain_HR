# Google Cloud Run 배포 가이드

## 개요
이 가이드는 **JWT 토큰 기반 인증**을 사용하는 HR 관리 시스템 백엔드를 Google Cloud Run에 배포하는 방법을 설명합니다.

> ⚠️ **중요**: 2025년 8월 JWT 마이그레이션으로 인해 세션 기반 설정이 완전히 제거되었습니다. 이 가이드는 JWT 인증 시스템을 위한 최신 배포 방법을 제공합니다.

## 현재 배포 상태
- **Production URL**: https://hr-backend-429401177957.asia-northeast3.run.app
- **Authentication**: JWT Token-based
- **Phase 4 Features**: Optional (환경변수로 활성화)

## 사전 요구사항

### 1. Google Cloud Platform 설정
```bash
# Google Cloud SDK 설치 (macOS)
brew install --cask google-cloud-sdk

# 인증 설정
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 필요한 API 활성화
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. 프로젝트 ID 설정
```bash
export PROJECT_ID="hr-management-system"
gcloud config set project $PROJECT_ID
```

## JWT Secret Manager 설정

### 1. MongoDB 연결 문자열 저장
```bash
# 시크릿 생성
echo "mongodb+srv://hr_app_user:YOUR_PASSWORD@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev" | \
gcloud secrets create mongodb-uri --data-file=-

# 또는 파일에서 읽기
gcloud secrets create mongodb-uri --data-file=mongodb-uri.txt
```

### 2. JWT 시크릿 저장
```bash
# 강력한 랜덤 JWT 시크릿 생성 및 저장
openssl rand -base64 64 | gcloud secrets create jwt-secret --data-file=-

# Phase 4: Refresh Token 시크릿 (선택사항)
openssl rand -base64 64 | gcloud secrets create refresh-token-secret --data-file=-
```

### 3. Cloud Run 서비스 계정에 권한 부여
```bash
# 프로젝트 번호 가져오기
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# JWT Secret Manager 접근 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Phase 4: Refresh Token 시크릿 권한
gcloud secrets add-iam-policy-binding refresh-token-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 배포 방법

### 방법 1: 기본 JWT 배포 (권장)
```bash
# 저장소 루트에서 실행
gcloud builds submit --config cloudbuild.yaml

# 특정 태그로 배포
gcloud builds submit --config cloudbuild.yaml --substitutions _TAG=v1.0.0
```

### 방법 2: 수동 JWT 배포
```bash
# 1. Docker 이미지 빌드
docker build -t gcr.io/$PROJECT_ID/hr-backend ./backend

# 2. Container Registry에 푸시
docker push gcr.io/$PROJECT_ID/hr-backend

# 3. 기본 JWT 설정으로 Cloud Run에 배포
gcloud run deploy hr-backend \
  --image gcr.io/$PROJECT_ID/hr-backend \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://smpain-hr.vercel.app" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest" \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=300 \
  --max-instances=10
```

### 방법 3: Phase 4 고급 기능 포함 배포
```bash
# JWT + Refresh Tokens + Token Blacklisting
gcloud run deploy hr-backend \
  --image gcr.io/$PROJECT_ID/hr-backend \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://smpain-hr.vercel.app,USE_REFRESH_TOKENS=true,ENABLE_TOKEN_BLACKLIST=true,ACCESS_TOKEN_EXPIRES_IN=15m,REFRESH_TOKEN_EXPIRES_IN=7d" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest,REFRESH_TOKEN_SECRET=refresh-token-secret:latest" \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=300 \
  --max-instances=10
```

### 방법 4: YAML 파일 사용
```bash
# 서비스 배포
gcloud run services replace deploy/cloud-run-service.yaml \
  --region asia-northeast3
```

## 환경별 배포

### Production 환경 (현재 배포)
```bash
# 프로덕션 시크릿 생성
gcloud secrets create mongodb-uri-prod --data-file=mongodb-uri-prod.txt
gcloud secrets create jwt-secret-prod --data-file=jwt-secret-prod.txt

# 기본 JWT 프로덕션 서비스 배포
gcloud run deploy hr-backend-prod \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://smpain-hr.vercel.app" \
  --set-secrets="MONGODB_URI=mongodb-uri-prod:latest,JWT_SECRET=jwt-secret-prod:latest" \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=20

# Phase 4 기능 포함 프로덕션 배포
gcloud run deploy hr-backend-prod \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://smpain-hr.vercel.app,USE_REFRESH_TOKENS=true,ENABLE_TOKEN_BLACKLIST=true" \
  --set-secrets="MONGODB_URI=mongodb-uri-prod:latest,JWT_SECRET=jwt-secret-prod:latest,REFRESH_TOKEN_SECRET=refresh-token-secret-prod:latest" \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=20
```

### Staging 환경
```bash
# 스테이징 서비스 배포 (JWT)
gcloud run deploy hr-backend-staging \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-env-vars="NODE_ENV=staging,FRONTEND_URL=https://staging-hr.vercel.app" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest" \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=5
```

## JWT 환경변수 설정

### 필수 환경변수
| 변수명 | 설명 | Secret Manager |
|--------|------|----------------|
| `JWT_SECRET` | JWT 토큰 서명용 비밀키 | `jwt-secret` |
| `MONGODB_URI` | MongoDB 연결 문자열 | `mongodb-uri` |
| `FRONTEND_URL` | CORS 설정용 프론트엔드 URL | 직접 설정 |

### Phase 4 고급 기능 (선택사항)
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `USE_REFRESH_TOKENS` | 리프레시 토큰 사용 여부 | `false` |
| `ENABLE_TOKEN_BLACKLIST` | 토큰 블랙리스트 사용 여부 | `false` |
| `ACCESS_TOKEN_EXPIRES_IN` | 액세스 토큰 만료 시간 | `24h` |
| `REFRESH_TOKEN_EXPIRES_IN` | 리프레시 토큰 만료 시간 | `7d` |
| `REFRESH_TOKEN_SECRET` | 리프레시 토큰 서명용 비밀키 | Secret Manager |

## GitHub Actions CI/CD 설정

### 1. Google Cloud 서비스 계정 생성
```bash
# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# 필요한 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# JWT 시크릿 접근 권한
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 키 파일 생성
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

### 2. GitHub Secrets 설정
GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 추가:

- `GCP_PROJECT_ID`: Google Cloud 프로젝트 ID
- `GCP_SA_KEY`: 위에서 생성한 `github-actions-key.json` 파일의 내용

## 모니터링 및 로깅

### 1. JWT 인증 로그 확인
```bash
# 실시간 로그 스트리밍 (JWT 인증 로그 포함)
gcloud run services logs tail hr-backend --region=asia-northeast3

# JWT 관련 로그 필터링
gcloud run services logs read hr-backend --region=asia-northeast3 --filter="JWT"

# 최근 인증 로그 확인
gcloud run services logs read hr-backend --region=asia-northeast3 --limit=50 --filter="Authentication"
```

### 2. JWT 토큰 메트릭 모니터링
```bash
# 서비스 상태 확인
gcloud run services describe hr-backend --region=asia-northeast3

# JWT 인증 실패율 모니터링
gcloud run revisions list --service=hr-backend --region=asia-northeast3
```

### 3. JWT 관련 알림 설정
Google Cloud Console에서 다음 JWT 관련 알림을 설정하는 것을 권장합니다:
- JWT 토큰 검증 실패율 > 5%
- 401 Unauthorized 응답률 > 10%  
- 응답 시간 > 1초
- 메모리 사용률 > 80%
- CPU 사용률 > 80%

## 트러블슈팅

### 1. JWT 관련 문제들

#### JWT 토큰 검증 실패
```bash
# JWT 시크릿 확인
gcloud secrets versions access latest --secret="jwt-secret"

# JWT 토큰 테스트
curl -X POST https://hr-backend-429401177957.asia-northeast3.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 인증이 필요한 엔드포인트 테스트
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://hr-backend-429401177957.asia-northeast3.run.app/api/auth/me
```

#### JWT 시크릿 접근 권한 오류
```bash
# 서비스 계정 권한 확인
gcloud secrets get-iam-policy jwt-secret

# JWT 시크릿 권한 재부여
gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

#### CORS 문제 (JWT 크로스 도메인)
```bash
# FRONTEND_URL 환경변수 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(spec.template.spec.containers[0].env[].value)"

# CORS 설정 업데이트
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --update-env-vars="FRONTEND_URL=https://smpain-hr.vercel.app"
```

### 2. Phase 4 기능 디버깅

#### Refresh Token 문제
```bash
# Refresh Token 시크릿 확인
gcloud secrets versions access latest --secret="refresh-token-secret"

# Phase 4 환경변수 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="yaml" | grep -A 10 "env:"
```

#### Token Blacklisting 문제
```bash
# 블랙리스트 기능 상태 확인
curl https://hr-backend-429401177957.asia-northeast3.run.app/health

# 로그아웃 후 토큰 유효성 테스트
curl -X POST https://hr-backend-429401177957.asia-northeast3.run.app/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 일반적인 디버깅 도구

#### 로컬에서 동일한 JWT 환경 테스트
```bash
# Secret Manager에서 JWT 값 가져오기
export MONGODB_URI=$(gcloud secrets versions access latest --secret="mongodb-uri")
export JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret")

# Phase 4 시크릿도 포함
export REFRESH_TOKEN_SECRET=$(gcloud secrets versions access latest --secret="refresh-token-secret")

# 로컬에서 동일한 환경변수로 컨테이너 실행
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="$MONGODB_URI" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e FRONTEND_URL="https://smpain-hr.vercel.app" \
  -e USE_REFRESH_TOKENS=true \
  -e ENABLE_TOKEN_BLACKLIST=true \
  gcr.io/$PROJECT_ID/hr-backend
```

#### JWT 헬스 체크 테스트
```bash
# 서비스 URL 가져오기
SERVICE_URL=$(gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(status.url)")

# JWT 상태 포함 헬스 체크
curl $SERVICE_URL/health

# JWT 인증 테스트
curl -X POST $SERVICE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

## 비용 최적화

### 1. JWT 기반 리소스 조정
```bash
# JWT는 세션보다 경량이므로 메모리 최적화 가능
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --memory=256Mi \
  --cpu=0.5 \
  --concurrency=100
```

### 2. Phase 4 기능 비용 영향
- **Refresh Tokens**: 메모리 사용량 거의 증가 없음
- **Token Blacklisting**: 메모리 사용량 약간 증가 (Redis 권장)
- **전체적으로 세션 대비 비용 절감**

### 3. 예상 비용 (JWT 기반)
- 요청 수: 100만 건/월 = ~$2.40
- CPU 시간: 8,000 초/월 = ~$1.92 (JWT 처리 효율성)
- 메모리: 256Mi × 8,000 초/월 = ~$0.24 (세션 스토어 불필요)
- **총 예상 비용: ~$4-7/월** (세션 기반 대비 20-30% 절약)

## 보안 설정

### 1. JWT 보안 강화
```bash
# JWT 시크릿 로테이션
openssl rand -base64 64 | gcloud secrets versions add jwt-secret --data-file=-

# 서비스 업데이트 (자동으로 최신 시크릿 사용)
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --update-secrets="JWT_SECRET=jwt-secret:latest"
```

### 2. IAM 권한 최소화
```bash
# JWT 전용 커스텀 역할 생성
gcloud iam roles create hrJwtBackendRole \
  --project=$PROJECT_ID \
  --title="HR JWT Backend Role" \
  --permissions="secretmanager.versions.access,run.services.get"
```

### 3. Phase 4 보안 기능
```bash
# Token Blacklisting과 VPC 연결 (고급 보안)
gcloud compute networks vpc-access connectors create hr-connector \
  --region=asia-northeast3 \
  --subnet=default \
  --subnet-project=$PROJECT_ID

gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --vpc-connector=hr-connector \
  --set-env-vars="ENABLE_TOKEN_BLACKLIST=true"
```

## 백업 및 재해 복구

### 1. JWT 시크릿 백업
```bash
# JWT 시크릿 백업
gcloud secrets versions access latest --secret="jwt-secret" > jwt-secret-backup.enc
gcloud secrets versions access latest --secret="refresh-token-secret" > refresh-secret-backup.enc

# 다중 리전 복제
gcloud secrets replication update jwt-secret \
  --set-locations="asia-northeast3,us-central1"
```

### 2. 무중단 배포 (JWT)
```bash
# 새 버전 배포 (기존 JWT 토큰 유효성 유지)
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --image=gcr.io/$PROJECT_ID/hr-backend:NEW_VERSION \
  --revision-suffix=jwt-v2
```

## 마이그레이션 정리

### 세션에서 JWT로 변경된 사항
- ❌ `SESSION_SECRET` → ✅ `JWT_SECRET`  
- ❌ MongoDB 세션 스토어 → ✅ Stateless JWT
- ❌ Cookie 기반 인증 → ✅ Authorization 헤더
- ❌ 서버 메모리 사용 → ✅ 클라이언트 토큰 저장
- ❌ CORS 쿠키 문제 → ✅ 크로스 도메인 호환

### 사용하지 않는 시크릿 정리
```bash
# 이전 세션 시크릿 삭제 (선택사항)
gcloud secrets delete session-secret --quiet
gcloud secrets delete session-secret-prod --quiet
```

이 가이드를 따라하면 JWT 기반 HR 백엔드를 안전하고 효율적으로 Google Cloud Run에 배포할 수 있습니다.