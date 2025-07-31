# Google Cloud Run 배포 가이드

## 개요
이 가이드는 HR 관리 시스템 백엔드를 Google Cloud Run에 배포하는 방법을 설명합니다.

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

## Secret Manager 설정

### 1. MongoDB 연결 문자열 저장
```bash
# 시크릿 생성
echo "mongodb+srv://hr_app_user:YOUR_PASSWORD@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev" | \
gcloud secrets create mongodb-uri --data-file=-

# 또는 파일에서 읽기
gcloud secrets create mongodb-uri --data-file=mongodb-uri.txt
```

### 2. 세션 시크릿 저장
```bash
# 강력한 랜덤 시크릿 생성 및 저장
openssl rand -base64 32 | gcloud secrets create session-secret --data-file=-
```

### 3. Cloud Run 서비스 계정에 권한 부여
```bash
# 프로젝트 번호 가져오기
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Secret Manager 접근 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 배포 방법

### 방법 1: Cloud Build 사용 (권장)
```bash
# 저장소 루트에서 실행
gcloud builds submit --config cloudbuild.yaml

# 특정 태그로 배포
gcloud builds submit --config cloudbuild.yaml --substitutions _TAG=v1.0.0
```

### 방법 2: 수동 배포
```bash
# 1. Docker 이미지 빌드
docker build -t gcr.io/$PROJECT_ID/hr-backend ./backend

# 2. Container Registry에 푸시
docker push gcr.io/$PROJECT_ID/hr-backend

# 3. Cloud Run에 배포
gcloud run deploy hr-backend \
  --image gcr.io/$PROJECT_ID/hr-backend \
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

### 방법 3: YAML 파일 사용
```bash
# 서비스 배포
gcloud run services replace deploy/cloud-run-service.yaml \
  --region asia-northeast3
```

## 환경별 배포

### Production 환경
```bash
# 프로덕션 시크릿 생성
gcloud secrets create mongodb-uri-prod --data-file=mongodb-uri-prod.txt
gcloud secrets create session-secret-prod --data-file=session-secret-prod.txt

# 프로덕션 서비스 배포
gcloud run deploy hr-backend-prod \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-secrets="MONGODB_URI=mongodb-uri-prod:latest,SESSION_SECRET=session-secret-prod:latest" \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=20
```

### Staging 환경
```bash
# 스테이징 서비스 배포
gcloud run deploy hr-backend-staging \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,SESSION_SECRET=session-secret:latest" \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=5
```

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

# 키 파일 생성
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

### 2. GitHub Secrets 설정
GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 추가:

- `GCP_PROJECT_ID`: Google Cloud 프로젝트 ID
- `GCP_SA_KEY`: 위에서 생성한 `github-actions-key.json` 파일의 내용

## 모니터링 및 로깅

### 1. 로그 확인
```bash
# 실시간 로그 스트리밍
gcloud run services logs tail hr-backend --region=asia-northeast3

# 최근 로그 확인
gcloud run services logs read hr-backend --region=asia-northeast3 --limit=50
```

### 2. 메트릭 모니터링
```bash
# 서비스 상태 확인
gcloud run services describe hr-backend --region=asia-northeast3

# 트래픽 상태 확인
gcloud run revisions list --service=hr-backend --region=asia-northeast3
```

### 3. 알림 설정
Google Cloud Console에서 다음 알림을 설정하는 것을 권장합니다:
- 오류율 > 5%
- 응답 시간 > 1초
- 메모리 사용률 > 80%
- CPU 사용률 > 80%

## 트러블슈팅

### 1. 일반적인 문제들

#### 배포 실패
```bash
# 빌드 로그 확인
gcloud builds log BUILD_ID

# 서비스 이벤트 확인
gcloud run services describe hr-backend --region=asia-northeast3 --format="yaml"
```

#### 시크릿 접근 권한 오류
```bash
# 서비스 계정 권한 확인
gcloud secrets get-iam-policy mongodb-uri

# 권한 재부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

#### Cold Start 성능 문제
```bash
# 최소 인스턴스 설정
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --min-instances=1
```

### 2. 디버깅 도구

#### 로컬에서 동일한 환경 테스트
```bash
# Secret Manager에서 값 가져오기
MONGODB_URI=$(gcloud secrets versions access latest --secret="mongodb-uri")
SESSION_SECRET=$(gcloud secrets versions access latest --secret="session-secret")

# 로컬에서 동일한 환경변수로 컨테이너 실행
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="$MONGODB_URI" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  gcr.io/$PROJECT_ID/hr-backend
```

#### 헬스 체크 테스트
```bash
# 서비스 URL 가져오기
SERVICE_URL=$(gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(status.url)")

# 헬스 체크 테스트
curl $SERVICE_URL/health
```

## 비용 최적화

### 1. 리소스 조정
```bash
# 리소스 사용량에 따라 조정
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --memory=256Mi \
  --cpu=0.5 \
  --concurrency=100
```

### 2. 트래픽 기반 스케일링
```bash
# 최대 인스턴스 제한
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --max-instances=5
```

### 3. 예상 비용 계산
- 요청 수: 100만 건/월 = ~$2.40
- CPU 시간: 10,000 초/월 = ~$2.40  
- 메모리: 512Mi × 10,000 초/월 = ~$0.48
- **총 예상 비용: ~$5-10/월** (낮은 트래픽 기준)

## 보안 설정

### 1. IAM 권한 최소화
```bash
# 커스텀 역할 생성 (필요한 권한만)
gcloud iam roles create hrBackendRole \
  --project=$PROJECT_ID \
  --title="HR Backend Role" \
  --permissions="secretmanager.versions.access,run.services.get"
```

### 2. VPC 연결 (선택사항)
```bash
# VPC Connector 생성
gcloud compute networks vpc-access connectors create hr-connector \
  --region=asia-northeast3 \
  --subnet=default \
  --subnet-project=$PROJECT_ID

# Cloud Run에 VPC 연결
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --vpc-connector=hr-connector
```

### 3. 인증 설정 (필요시)
```bash
# 인증 필요로 변경
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --no-allow-unauthenticated
```

## 백업 및 재해 복구

### 1. 이미지 백업
```bash
# 프로덕션 이미지 태깅
docker tag gcr.io/$PROJECT_ID/hr-backend:latest gcr.io/$PROJECT_ID/hr-backend:backup-$(date +%Y%m%d)
docker push gcr.io/$PROJECT_ID/hr-backend:backup-$(date +%Y%m%d)
```

### 2. 롤백 절차
```bash
# 이전 버전으로 롤백
gcloud run services update hr-backend \
  --region=asia-northeast3 \
  --image=gcr.io/$PROJECT_ID/hr-backend:PREVIOUS_TAG
```

이 가이드를 따라하면 HR 백엔드를 안전하고 효율적으로 Google Cloud Run에 배포할 수 있습니다.