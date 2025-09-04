# DEPLOY-01 배포 전 필수 작업 체크리스트

**작성일**: 2025년 09월 04일  
**예상 총 소요 시간**: 4-6시간  
**상태**: 시작 전

## 📋 작업 순서 및 체크리스트

---

## Phase 1: 코드 정리 (30분)

### [ ] 1.1 TEST-02 테스트 파일 커밋 (10분)
```bash
# 1. 상태 확인
git status

# 2. TEST-02 테스트 파일들 추가
git add backend/tests/integration/payroll-access.test.js
git add backend/tests/integration/auth-refresh.test.js
git add backend/tests/integration/daily-workers.test.js
git add backend/tests/integration/incentive-calculation.test.js
git add backend/tests/integration/TEST-02-RESULTS.md

# 3. 계획 파일 이동 추가
git add plans/archived/TEST-02-recent-features-integration-test-plan.md
git add plans/archived/FEAT-07-payroll-access-restriction-plan.md

# 4. INDEX-PLAN.md 업데이트 추가
git add INDEX-PLAN.md

# 5. 커밋
git commit -m "test: Add TEST-02 integration tests for recent features

- Add payroll access control tests (Admin-only)
- Add refresh token flow tests
- Add daily workers CRUD tests
- Add incentive calculation tests
- Update INDEX-PLAN.md with TEST-02 completion"
```

### [ ] 1.2 배포 준비 문서 커밋 (5분)
```bash
# 1. 평가 문서 추가
git add DEPLOY-01-READINESS-ASSESSMENT.md
git add DEPLOY-01-PRE-DEPLOYMENT-TASKS.md

# 2. 커밋
git commit -m "docs: Add DEPLOY-01 pre-deployment documentation"
```

### [ ] 1.3 브랜치 상태 확인 (5분)
```bash
# 1. 현재 브랜치 확인
git branch

# 2. 원격 저장소와 동기화
git pull origin master

# 3. 푸시
git push origin master

# 4. 충돌 해결 (필요시)
```

### [ ] 1.4 태그 생성 (10분)
```bash
# 1. 배포 전 태그 생성
git tag -a v1.0.0-pre-deploy -m "Pre-deployment state before DEPLOY-01

Features included:
- FEAT-07: Admin-only payroll access
- FEAT-06: Refresh token integration
- FEAT-05: Incentive calculation and daily workers
- REFACTOR-10: Centralized permissions/CORS/logging"

# 2. 태그 푸시
git push origin v1.0.0-pre-deploy
```

---

## Phase 2: 테스트 검증 (2시간)

### [ ] 2.1 로컬 테스트 실행 (30분)
```bash
cd backend

# 1. 개별 TEST-02 테스트 실행
npm test -- tests/integration/payroll-access.test.js
npm test -- tests/integration/auth-refresh.test.js
npm test -- tests/integration/daily-workers.test.js
npm test -- tests/integration/incentive-calculation.test.js

# 2. 모든 통합 테스트 실행
npm test -- tests/integration/

# 3. 전체 테스트 스위트 실행
npm test

# 4. 테스트 커버리지 확인
npm run test:coverage
```

### [ ] 2.2 테스트 실패 시 수정 (30분)
```bash
# MongoDB 연결 문제 시
# 1. MongoDB 실행 확인
sudo systemctl status mongodb

# 2. 테스트 DB 생성
mongosh
> use SM_nomu_test
> db.createCollection("users")
> exit

# 3. 테스트 재실행
npm test -- tests/integration/payroll-access.test.js --verbose
```

### [ ] 2.3 E2E 테스트 (30분)
```bash
# 1. Backend 시작
cd backend
npm run dev

# 2. Frontend 시작 (새 터미널)
cd frontend
npm run dev

# 3. 수동 테스트 시나리오
# - Admin 로그인 → 급여 메뉴 접근 확인
# - Supervisor 로그인 → 급여 메뉴 차단 확인
# - 토큰 만료 시뮬레이션 → 자동 갱신 확인
# - 일용직 CRUD 테스트
# - 인센티브 계산 테스트
```

### [ ] 2.4 성능 테스트 (30분)
```bash
# 1. 부하 테스트 도구 설치 (없으면)
npm install -g artillery

# 2. 테스트 시나리오 작성
cat > load-test.yml << EOF
config:
  target: "http://localhost:5455"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@test.com"
            password: "test123"
      - get:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ response.token }}"
EOF

# 3. 부하 테스트 실행
artillery run load-test.yml

# 4. 결과 분석
# - Response time < 200ms
# - Error rate < 1%
# - Throughput > 100 req/s
```

---

## Phase 3: 환경 설정 (1시간)

### [ ] 3.1 프로덕션 환경 변수 파일 생성 (20분)
```bash
cd backend

# 1. 프로덕션 환경 변수 파일 생성
cat > .env.production << EOF
NODE_ENV=production
PORT=8080

# MongoDB Production (Google Cloud)
# ⚠️ 실제 값으로 교체 필요
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/SM_nomu_prod
DB_NAME=SM_nomu_prod

# JWT Configuration
# ⚠️ 강력한 시크릿으로 변경 필요
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://smpain-hr.vercel.app

# Google Cloud
GCP_PROJECT_ID=your-project-id
GCP_REGION=asia-northeast3

# Feature Flags
USE_REFRESH_TOKENS=true
MODULAR_ERROR_SERVICE=false

# Logging
LOG_LEVEL=info
EOF

# 2. .gitignore 확인
grep ".env.production" .gitignore || echo ".env.production" >> .gitignore
```

### [ ] 3.2 Google Cloud Secret Manager 설정 (20분)
```bash
# 1. gcloud CLI 로그인
gcloud auth login

# 2. 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 3. 시크릿 생성
gcloud secrets create mongodb-uri --data-file=- << EOF
mongodb+srv://username:password@cluster.mongodb.net/SM_nomu_prod
EOF

gcloud secrets create jwt-secret --data-file=- << EOF
$(openssl rand -base64 32)
EOF

gcloud secrets create jwt-refresh-secret --data-file=- << EOF
$(openssl rand -base64 32)
EOF

# 4. Cloud Run 서비스 계정에 권한 부여
gcloud secrets add-iam-policy-binding mongodb-uri \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

### [ ] 3.3 Vercel 환경 변수 설정 (10분)
```bash
# 1. Vercel CLI 설치 (없으면)
npm i -g vercel

# 2. Vercel 로그인
vercel login

# 3. 환경 변수 설정
cd frontend

vercel env add VITE_API_URL production
# 입력: https://hr-backend-429401177957.asia-northeast3.run.app

vercel env add VITE_APP_ENV production
# 입력: production

# 4. 확인
vercel env ls production
```

### [ ] 3.4 데이터베이스 인덱스 확인 (10분)
```bash
# 1. 프로덕션 DB 연결
mongosh "mongodb+srv://username:password@cluster.mongodb.net/SM_nomu_prod"

# 2. 인덱스 확인
use SM_nomu_prod
db.users.getIndexes()
db.leave_requests.getIndexes()
db.payroll.getIndexes()
db.dailyWorkers.getIndexes()
db.sales.getIndexes()

# 3. 필요시 인덱스 생성
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "userId": 1 }, { unique: true })
db.leave_requests.createIndex({ "userId": 1, "status": 1 })
db.payroll.createIndex({ "month": 1, "userId": 1 })
```

---

## Phase 4: 배포 준비 최종 확인 (30분)

### [ ] 4.1 롤백 스크립트 준비 (10분)
```bash
# 1. 롤백 스크립트 생성
cat > scripts/rollback-deploy.sh << 'EOF'
#!/bin/bash

echo "🔄 Starting rollback..."

# 1. 이전 버전 태그로 체크아웃
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD^)
git checkout $PREVIOUS_TAG

# 2. Cloud Run 이전 리비전으로 롤백
gcloud run services update-traffic hr-backend \
    --to-revisions=PREVIOUS_REVISION=100

# 3. Vercel 롤백
vercel rollback

echo "✅ Rollback completed to $PREVIOUS_TAG"
EOF

chmod +x scripts/rollback-deploy.sh
```

### [ ] 4.2 백업 스크립트 준비 (10분)
```bash
# 1. 백업 스크립트 생성
cat > scripts/backup-production.sh << 'EOF'
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$TIMESTAMP"

echo "📦 Starting production backup..."

# 1. 데이터베이스 백업
mkdir -p $BACKUP_DIR
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb"

# 2. 환경 변수 백업 (민감정보 제외)
cp .env.production $BACKUP_DIR/env.backup
sed -i 's/JWT_SECRET=.*/JWT_SECRET=REDACTED/' $BACKUP_DIR/env.backup
sed -i 's/password=.*/password=REDACTED/' $BACKUP_DIR/env.backup

# 3. 압축
tar -czf backups/backup_$TIMESTAMP.tar.gz -C backups $TIMESTAMP

# 4. 정리
rm -rf $BACKUP_DIR

echo "✅ Backup completed: backups/backup_$TIMESTAMP.tar.gz"
EOF

chmod +x scripts/backup-production.sh
```

### [ ] 4.3 모니터링 설정 확인 (10분)
```bash
# 1. Google Cloud Monitoring 대시보드 확인
gcloud monitoring dashboards list

# 2. 알림 정책 확인
gcloud alpha monitoring policies list

# 3. 로그 확인 명령어 준비
cat > scripts/monitor-logs.sh << 'EOF'
#!/bin/bash

# Cloud Run 로그 확인
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hr-backend" \
    --limit 50 \
    --format json

# 에러 로그만 확인
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
    --limit 20
EOF

chmod +x scripts/monitor-logs.sh
```

---

## Phase 5: 최종 체크리스트 (10분)

### [ ] 5.1 필수 확인 사항
- [ ] 모든 테스트 통과
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 데이터베이스 백업 완료
- [ ] 롤백 계획 준비 완료
- [ ] 모니터링 설정 완료

### [ ] 5.2 문서 확인
- [ ] DEPLOY-01 계획서 최종 검토
- [ ] README.md 업데이트 필요 여부 확인
- [ ] API 문서 업데이트 필요 여부 확인

### [ ] 5.3 팀 공지 사항
```markdown
## 배포 공지

**배포 일시**: 2025-09-XX XX:00 (KST)
**예상 다운타임**: 없음 (Blue-Green 배포)
**주요 변경사항**:
- 급여 기능 Admin 전용으로 변경
- 자동 토큰 갱신 기능 추가
- 일용직 관리 기능 추가
- 인센티브 자동 계산 기능 추가

**영향받는 사용자**:
- Supervisor: 급여 메뉴 접근 불가
- 모든 사용자: 세션 재로그인 필요할 수 있음

**롤백 계획**: 문제 발생 시 30분 내 이전 버전으로 롤백
```

---

## 🎯 완료 기준

모든 체크박스가 체크되면 DEPLOY-01 진행 가능:

- [ ] Phase 1: 코드 정리 완료
- [ ] Phase 2: 테스트 검증 완료
- [ ] Phase 3: 환경 설정 완료
- [ ] Phase 4: 배포 준비 완료
- [ ] Phase 5: 최종 체크리스트 완료

**예상 총 소요 시간**: 4-6시간
**권장 작업 시간**: 트래픽이 적은 시간대 (새벽 또는 주말)

---

## 📞 비상 연락처

- 개발팀 리드: XXX-XXXX-XXXX
- 인프라 담당: XXX-XXXX-XXXX
- 데이터베이스 관리자: XXX-XXXX-XXXX

---

**Note**: 각 단계를 순차적으로 진행하며, 문제 발생 시 즉시 중단하고 원인 파악 후 진행하세요.