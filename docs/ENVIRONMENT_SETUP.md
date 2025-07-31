# 환경 변수 및 시크릿 설정 가이드

## 개요
HR 관리 시스템의 환경별 설정과 시크릿 관리 방법을 설명합니다.

## 환경별 구성

### 개발 환경 (Development)
```bash
# backend/.env.development
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev
SESSION_SECRET=hr-development-secret-2025
DB_NAME=SM_nomu
```

### 스테이징 환경 (Staging)
```bash
# Cloud Run 환경변수로 설정
NODE_ENV=staging
PORT=8080
MONGODB_URI=[Secret Manager에서 관리]
SESSION_SECRET=[Secret Manager에서 관리]
DB_NAME=SM_nomu
```

### 프로덕션 환경 (Production)
```bash
# Cloud Run 환경변수로 설정
NODE_ENV=production
PORT=8080
MONGODB_URI=[Secret Manager에서 관리]
SESSION_SECRET=[Secret Manager에서 관리]
DB_NAME=SM_nomu
```

## Google Cloud Secret Manager 설정

### 1. 개발용 시크릿 생성

#### MongoDB 연결 문자열
```bash
# 현재 개발용 연결 문자열 저장
echo "mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev" | \
gcloud secrets create mongodb-uri --data-file=-

# 버전 확인
gcloud secrets versions list mongodb-uri
```

#### 세션 시크릿
```bash
# 개발용 세션 시크릿 (현재 사용 중인 것)
echo "hr-development-secret-2025" | \
gcloud secrets create session-secret --data-file=-
```

### 2. 프로덕션용 시크릿 생성

#### 강력한 MongoDB 비밀번호 생성
```bash
# 1. MongoDB Atlas에서 새 사용자 생성
# Username: hr_app_prod
# Password: 강력한 랜덤 패스워드 (예: openssl rand -base64 32)

# 2. 프로덕션 연결 문자열 저장
echo "mongodb+srv://hr_app_prod:STRONG_RANDOM_PASSWORD@hr-cluster-prod.xxxxx.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-prod" | \
gcloud secrets create mongodb-uri-prod --data-file=-
```

#### 프로덕션 세션 시크릿
```bash
# 강력한 랜덤 세션 시크릿 생성
openssl rand -base64 64 | gcloud secrets create session-secret-prod --data-file=-
```

### 3. 스테이징용 시크릿 (선택사항)
```bash
# 스테이징은 개발용과 동일하게 사용하거나 별도 생성
gcloud secrets create mongodb-uri-staging --data-file=staging-mongodb.txt
gcloud secrets create session-secret-staging --data-file=staging-session.txt
```

## 시크릿 접근 권한 설정

### 1. Cloud Run 서비스 계정 권한
```bash
# 프로젝트 번호 가져오기
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 개발용 시크릿 접근 권한
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# 프로덕션용 시크릿 접근 권한
gcloud secrets add-iam-policy-binding mongodb-uri-prod \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret-prod \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 2. GitHub Actions 서비스 계정 권한
```bash
# GitHub Actions용 서비스 계정에도 동일한 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 로컬 개발 환경 설정

### 1. .env 파일 생성
```bash
# backend/.env.development 파일 생성 (이미 존재)
cp backend/.env.development.example backend/.env.development

# 실제 값으로 수정
nano backend/.env.development
```

### 2. 환경변수 로드 확인
```javascript
// backend/server.js에서 환경변수 로드 확인
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
console.log('🔍 PORT:', process.env.PORT);
```

### 3. 로컬 테스트
```bash
# 환경변수 확인
cd backend
node -e "
require('dotenv').config({ path: '.env.development' });
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET?.substring(0, 10) + '...');
"
```

## Cloud Run 배포 시 환경변수 설정

### 1. 개발/스테이징 환경
```bash
gcloud run deploy hr-backend \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-env-vars="NODE_ENV=staging,PORT=8080" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,SESSION_SECRET=session-secret:latest"
```

### 2. 프로덕션 환경
```bash
gcloud run deploy hr-backend-prod \
  --image gcr.io/$PROJECT_ID/hr-backend:latest \
  --region asia-northeast3 \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="MONGODB_URI=mongodb-uri-prod:latest,SESSION_SECRET=session-secret-prod:latest"
```

### 3. 환경변수 업데이트
```bash
# 기존 서비스의 환경변수 업데이트
gcloud run services update hr-backend \
  --region asia-northeast3 \
  --update-env-vars="NEW_VAR=new_value" \
  --remove-env-vars="OLD_VAR"
```

## 시크릿 관리 베스트 프랙티스

### 1. 시크릿 로테이션
```bash
# 새 버전의 시크릿 생성
echo "new-secret-value" | gcloud secrets versions add session-secret --data-file=-

# Cloud Run 서비스 업데이트 (자동으로 최신 버전 사용)
gcloud run services update hr-backend \
  --region asia-northeast3 \
  --update-secrets="SESSION_SECRET=session-secret:latest"

# 이전 버전 비활성화 (필요시)
gcloud secrets versions disable VERSION_ID --secret="session-secret"
```

### 2. 시크릿 백업
```bash
# 시크릿 값을 안전한 위치에 백업 (암호화된 저장소)
gcloud secrets versions access latest --secret="session-secret" > session-secret-backup.enc

# 여러 리전에 복제 (재해 복구용)
gcloud secrets replication update session-secret \
  --set-locations="asia-northeast3,us-central1"
```

### 3. 액세스 로깅
```bash
# 시크릿 접근 로그 활성화
gcloud logging sinks create secret-access-sink \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/security_logs \
  --log-filter='resource.type="secret" AND protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"'
```

## 환경변수 검증

### 1. 서버 시작 시 검증
```javascript
// backend/server.js에 추가
function validateEnvironment() {
  const required = ['MONGODB_URI', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
  
  // MongoDB URI 형식 검증
  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error('❌ Invalid MONGODB_URI format');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// 서버 시작 전에 호출
validateEnvironment();
```

### 2. 헬스 체크에서 설정 확인
```javascript
// /health 엔드포인트에서 환경 상태 포함
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    config: {
      mongodb: process.env.MONGODB_URI ? '✅ configured' : '❌ missing',
      session: process.env.SESSION_SECRET ? '✅ configured' : '❌ missing'
    }
  };
  
  const isHealthy = health.config.mongodb.includes('✅') && 
                   health.config.session.includes('✅');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

## 트러블슈팅

### 1. 시크릿 접근 오류
```bash
# 권한 확인
gcloud secrets get-iam-policy mongodb-uri

# 서비스 계정 확인
gcloud iam service-accounts list

# Cloud Run 서비스의 서비스 계정 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(spec.template.spec.serviceAccountName)"
```

### 2. 환경변수 누락
```bash
# Cloud Run 서비스의 환경변수 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="yaml" | grep -A 20 "env:"
```

### 3. 로컬에서 클라우드 시크릿 테스트
```bash
# 로컬에서 클라우드 시크릿 값 가져와서 테스트
export MONGODB_URI=$(gcloud secrets versions access latest --secret="mongodb-uri")
export SESSION_SECRET=$(gcloud secrets versions access latest --secret="session-secret")

# 로컬에서 동일한 환경으로 실행
npm run dev
```

이 가이드를 따라하면 안전하고 효율적으로 환경변수와 시크릿을 관리할 수 있습니다.