# HR 시스템 배포 실행 가이드

## 📋 전체 배포 순서 개요
1. **사전 준비**: 계정 생성 및 도구 설치
2. **1단계**: MongoDB Atlas 설정 (완료됨 ✅)
3. **2단계**: Google Cloud Run 백엔드 배포  
4. **3단계**: Vercel 프론트엔드 배포
5. **4단계**: CI/CD 파이프라인 완성
6. **최종 테스트**: 전체 시스템 검증

---

## 🛠️ 사전 준비사항

### 필요한 계정들
- [x] **MongoDB Atlas**: 계정 있음 (hr-cluster-dev 생성됨)
- [x] **Vercel**: 계정 있음 (GitHub 연동됨)
- [ ] **Google Cloud Platform**: 계정 필요
- [x] **GitHub**: 저장소 있음

### 설치할 도구들
```bash
# Google Cloud SDK 설치
# macOS
brew install --cask google-cloud-sdk

# Windows (PowerShell 관리자 권한)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# Ubuntu/Debian
curl https://sdk.cloud.google.com | bash

# Vercel CLI (이미 설치되어 있다면 스킵)
npm install -g vercel
```

---

## 🚀 2단계: Google Cloud Run 백엔드 배포

### 2-1. Google Cloud 프로젝트 생성 및 설정

#### A. GCP 계정 생성 및 프로젝트 생성
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성:
   - 프로젝트 이름: `hr-management-system`
   - 프로젝트 ID: 자동 생성된 ID 기록해둘 것 tidy-muse-467402-j3

#### B. 결제 계정 연결
1. 좌측 메뉴 > 결제 > 결제 계정 연결
2. 신용카드 등록 (무료 크레딧 $300 제공)

#### C. 필요한 API 활성화
```bash
# 터미널에서 실행 (Google Cloud SDK 설치 후)
gcloud auth login
gcloud config set project tidy-muse-467402-j3

# 필요한 API 활성화
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2-2. Secret Manager에 환경변수 저장

#### A. MongoDB 연결 문자열 저장
```bash
# 현재 Atlas 연결 문자열 (개발용)
echo "mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev" | \
gcloud secrets create mongodb-uri --data-file=-
```

#### B. 세션 시크릿 저장
```bash
# 강력한 랜덤 시크릿 생성 및 저장
openssl rand -base64 32 | gcloud secrets create session-secret --data-file=-
```

#### C. 권한 설정
```bash
# 프로젝트 번호 가져오기
PROJECT_NUMBER=$(gcloud projects describe tidy-muse-467402-j3 --format="value(projectNumber)")

# Cloud Run 서비스 계정에 시크릿 접근 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 2-3. 백엔드 배포 실행

#### A. 로컬에서 Docker 테스트 (선택사항)
```bash
cd backend

# Docker 이미지 빌드
docker build -t hr-backend .

# 로컬 테스트 실행
docker run -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev" \
  -e SESSION_SECRET="test-secret" \
  hr-backend

# 다른 터미널에서 테스트
curl http://localhost:8080/health
# Ctrl+C로 중단
```

#### B. Cloud Build로 배포
```bash
# 저장소 루트 디렉토리에서 실행
cd /mnt/d/my_programs/HR

# Cloud Build 실행
gcloud builds submit --config cloudbuild.yaml
```

#### C. 배포 확인
```bash
# 서비스 URL 확인
gcloud run services describe hr-backend \
  --region=asia-northeast3 \
  --format="value(status.url)"

# 결과 예시: https://hr-backend-xxxxx-an.a.run.app
# 이 URL을 기록해둘 것!

# 헬스 체크 테스트
curl https://hr-backend-xxxxx-an.a.run.app/health
```

---

## 🎨 3단계: Vercel 프론트엔드 배포

### 3-1. Vercel 프로젝트 설정

#### A. Vercel 대시보드에서 프로젝트 생성
1. https://vercel.com/dashboard 접속
2. "Add New..." > "Project" 클릭
3. GitHub 저장소 연결:
   - Import Git Repository에서 `HR` 저장소 선택
4. 프로젝트 설정:
   - **Project Name**: `hr-frontend`
   - **Framework Preset**: `Other`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### B. 환경변수 설정
Settings > Environment Variables에서 추가:

**Production 환경변수:**
```
변수명: VITE_API_URL
값: https://hr-backend-xxxxx-an.a.run.app (위에서 기록한 URL)
환경: Production

변수명: VITE_NODE_ENV  
값: production
환경: Production

변수명: VITE_APP_NAME
값: HR Management System
환경: Production
```

**Preview 환경변수 (선택사항):**
```
변수명: VITE_API_URL
값: https://hr-backend-xxxxx-an.a.run.app (같은 URL 사용)
환경: Preview

변수명: VITE_NODE_ENV
값: staging  
환경: Preview
```

### 3-2. 첫 배포 실행

#### A. 수동 배포 트리거
1. Vercel Dashboard > Deployments
2. "Redeploy" 클릭 (또는 GitHub에 commit push)

#### B. 배포 상태 확인
- 빌드 로그에서 에러가 없는지 확인
- 성공 시 배포 URL 생성됨 (예: https://hr-frontend.vercel.app)

### 3-3. 로컬에서 Vercel CLI 배포 (대안)

#### A. CLI 설정
```bash
cd frontend
vercel login
vercel link
```

#### B. 환경변수 설정 (CLI)
```bash
vercel env add VITE_API_URL production
# 입력: https://hr-backend-xxxxx-an.a.run.app

vercel env add VITE_NODE_ENV production  
# 입력: production
```

#### C. 배포 실행
```bash
# 프로덕션 배포
vercel --prod
```

---

## 🔗 4단계: 시스템 연동 및 테스트

### 4-1. 백엔드 CORS 설정 업데이트

#### A. Vercel 도메인 확인
배포 완료 후 실제 Vercel URL을 확인하고 기록:
- 프로덕션: `https://hr-frontend.vercel.app`
- Preview: `https://hr-frontend-git-main.vercel.app`

#### B. 백엔드 재배포 (CORS 업데이트)
현재 코드는 이미 Vercel 도메인 패턴을 지원하므로 재배포:
```bash
# 백엔드 재배포
gcloud builds submit --config cloudbuild.yaml
```

### 4-2. 전체 시스템 테스트

#### A. 기본 기능 테스트
1. **프론트엔드 접속**: https://hr-frontend.vercel.app
2. **로그인 테스트**:
   - Username: `admin`
   - Password: `admin`
3. **대시보드 확인**: 로그인 후 메인 페이지 로드
4. **API 연결 확인**: 네트워크 탭에서 API 호출 확인

#### B. 상세 기능 테스트
```bash
# API 직접 테스트
curl -X POST https://hr-backend-xxxxx-an.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**웹 브라우저에서 확인할 것들:**
- [ ] 로그인/로그아웃 동작
- [ ] 사용자 관리 페이지
- [ ] 급여 관리 기능  
- [ ] 휴가 관리 기능
- [ ] 파일 업로드/다운로드
- [ ] 모바일 반응형 디자인

---

## ⚙️ 5단계: CI/CD 자동화 설정

### 5-1. GitHub Actions Secrets 설정

#### A. Google Cloud 서비스 계정 생성
```bash
# 서비스 계정 생성
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# 필요한 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 키 파일 생성
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### B. GitHub Repository Secrets 설정
GitHub > Settings > Secrets and variables > Actions에서 추가:

**Google Cloud 관련:**
```
GCP_PROJECT_ID: YOUR_PROJECT_ID
GCP_SA_KEY: (github-actions-key.json 파일 내용 전체 복사)
```

**Vercel 관련:**
```bash
# Vercel 토큰 생성
vercel login
# Vercel Dashboard > Settings > Tokens > Create Token

# 프로젝트 정보 확인
cd frontend
vercel link
cat .vercel/project.json
```

GitHub Secrets에 추가:
```
VERCEL_TOKEN: (위에서 생성한 토큰)
VERCEL_ORG_ID: (project.json의 orgId)
VERCEL_PROJECT_ID: (project.json의 projectId)
```

### 5-2. 자동 배포 테스트

#### A. 테스트 커밋 푸시
```bash
# 간단한 변경 사항 생성
echo "# Auto Deploy Test" >> README.md
git add README.md
git commit -m "test: GitHub Actions 자동 배포 테스트"
git push origin main
```

#### B. Actions 실행 확인
1. GitHub > Actions 탭에서 워크플로우 실행 확인
2. 백엔드, 프론트엔드 모두 성공적으로 배포되는지 확인

---

## ✅ 최종 검증 체크리스트

### 시스템 동작 확인
- [ ] **백엔드 헬스체크**: `https://hr-backend-xxxxx-an.a.run.app/health`
- [ ] **프론트엔드 접속**: `https://hr-frontend.vercel.app`
- [ ] **로그인 기능**: admin/admin으로 로그인 성공
- [ ] **API 연동**: 대시보드 데이터 로드 확인
- [ ] **세션 유지**: 페이지 새로고침 후에도 로그인 상태 유지
- [ ] **CORS 설정**: 브라우저 콘솔에 CORS 에러 없음

### 자동화 확인  
- [ ] **GitHub Actions**: 푸시 시 자동 배포 동작
- [ ] **백엔드 배포**: Cloud Build 성공
- [ ] **프론트엔드 배포**: Vercel 배포 성공
- [ ] **환경변수**: Production 환경에서 올바른 API URL 사용

### 성능 확인
- [ ] **응답 속도**: 페이지 로드 3초 이내
- [ ] **모바일 지원**: 스마트폰에서 정상 동작
- [ ] **에러 로깅**: 브라우저 콘솔에 critical 에러 없음

---

## 🚨 문제 해결 가이드

### 자주 발생하는 문제들

#### 1. 백엔드 배포 실패
```bash
# 빌드 로그 확인
gcloud builds log BUILD_ID

# 일반적인 해결책
- Secret Manager 권한 확인
- MongoDB Atlas IP 화이트리스트 확인
- 환경변수 값 검증
```

#### 2. 프론트엔드 CORS 에러
```bash
# 백엔드 로그 확인
gcloud run services logs tail hr-backend --region=asia-northeast3

# 해결책
- 백엔드 CORS 설정에 Vercel 도메인 추가
- 백엔드 재배포 필요
```

#### 3. 환경변수 문제
```bash
# Vercel 환경변수 확인
vercel env ls

# Google Cloud Secret 확인
gcloud secrets versions access latest --secret="mongodb-uri"
```

#### 4. GitHub Actions 실패
- Secrets 값 확인
- 권한 설정 재검토
- 워크플로우 로그 분석

---

## 🎯 완료 후 해야 할 일

### 보안 강화
1. **MongoDB Atlas 비밀번호 변경**
   - 프로덕션용 강력한 비밀번호 생성
   - Secret Manager 업데이트

2. **IP 화이트리스트 제한**
   - MongoDB Atlas에서 Cloud Run IP만 허용
   - 개발용 0.0.0.0/0 제거

3. **도메인 설정** (선택사항)
   - 커스텀 도메인 구매 및 연결
   - SSL 인증서 설정

### 모니터링 설정
1. **Google Cloud Monitoring** 알림 설정
2. **Vercel Analytics** 활성화
3. **에러 추적** 도구 연동 (Sentry 등)

### 데이터 백업
1. **MongoDB Atlas 자동 백업** 설정 확인
2. **정기 백업 스케줄** 수립

---

## 📞 지원 및 도움

### 문서 참조
- 상세 가이드: `/docs` 폴더의 각 서비스별 문서
- API 문서: 백엔드 코드 주석 참조

### 문제 발생 시
1. 해당 단계의 상세 문서 확인
2. 로그 확인 (Cloud Console, Vercel Dashboard)
3. GitHub Issues에 문제 리포트

---

**🎉 축하합니다! 모든 단계를 완료하면 HR 관리 시스템이 클라우드에서 안정적으로 운영됩니다.**

**예상 소요 시간**: 2-3시간 (처음 설정 시)
**월 운영 비용**: $5-35 (사용량에 따라)