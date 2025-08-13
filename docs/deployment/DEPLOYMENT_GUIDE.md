# HR 시스템 배포 가이드

## 배포 아키텍처 개요
- **백엔드**: Google Cloud Run (컨테이너)
- **프론트엔드**: Vercel (React/TypeScript)
- **데이터베이스**: MongoDB Atlas (관리형)

## 빠른 시작 가이드

### 1. 백엔드 배포 (Google Cloud Run)
```bash
# Google Cloud SDK 설치 및 인증
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Secret Manager에 환경변수 저장
echo "mongodb+srv://..." | gcloud secrets create mongodb-uri --data-file=-
echo "your-session-secret" | gcloud secrets create session-secret --data-file=-

# 백엔드 배포
gcloud builds submit --config cloudbuild.yaml
```

### 2. 프론트엔드 배포 (Vercel)
```bash
# Vercel CLI 설치 및 로그인
npm install -g vercel
vercel login

# 프로젝트 링크 및 배포
cd frontend
vercel link
vercel --prod
```

### 3. 환경변수 설정

#### Vercel 환경변수
```bash
vercel env add VITE_API_URL production
# 값: https://hr-backend-xxxxx-an.a.run.app

vercel env add VITE_NODE_ENV production
# 값: production
```

## 상세 가이드 링크
- [MongoDB Atlas 설정](docs/MONGODB_ATLAS_SETUP.md)
- [Google Cloud Run 배포](docs/CLOUD_RUN_DEPLOYMENT.md)
- [Vercel 프론트엔드 배포](docs/VERCEL_DEPLOYMENT.md)
- [환경변수 설정](docs/ENVIRONMENT_SETUP.md)

## GitHub Actions 자동 배포
저장소에 다음 secrets 설정:
- `GCP_PROJECT_ID`: Google Cloud 프로젝트 ID
- `GCP_SA_KEY`: 서비스 계정 키 (JSON)
- `VERCEL_TOKEN`: Vercel 배포 토큰
- `VERCEL_ORG_ID`: Vercel 조직 ID
- `VERCEL_PROJECT_ID`: Vercel 프로젝트 ID

설정 완료 후 `main` 브랜치에 푸시하면 자동 배포됩니다.

## 배포 상태 확인
- **백엔드 헬스체크**: `https://your-backend-url/health`
- **프론트엔드**: `https://your-frontend-url`
- **API 연결 테스트**: 로그인 기능 확인

## 트러블슈팅
1. **CORS 에러**: 백엔드 CORS 설정에 프론트엔드 도메인 추가
2. **세션 문제**: 백엔드 cookie sameSite 설정 확인
3. **빌드 실패**: 로컬에서 `npm run build` 테스트

## 예상 비용 (월간)
- **MongoDB Atlas**: 무료 (M0 티어)
- **Google Cloud Run**: ~$5-15 (낮은 트래픽)
- **Vercel**: 무료~$20 (사용량에 따라)
- **총 예상**: $5-35/월

## 지원 및 문의
- 상세 문서: `/docs` 폴더 참조
- 이슈 리포트: GitHub Issues 활용