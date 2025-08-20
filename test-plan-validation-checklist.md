# 테스트 계획 검증 체크리스트

## 1. 환경 설정 검증

### ✅ 포트 확인
- [x] 백엔드 포트: 5455 (확인됨: .env.development)
- [ ] 프론트엔드 포트: 확인 필요
- [ ] 테스트 DB 포트: 27017 (MongoDB 기본값)

### 🔍 확인 명령어
```bash
# 백엔드 포트 확인
grep -r "PORT" backend/.env.development
grep -r "app.listen" backend/server.js

# 프론트엔드 포트 확인
grep -r "PORT\|port" frontend/package.json
grep -r "VITE_PORT" frontend/

# MongoDB 연결 확인
grep -r "MONGODB_URI\|mongodb://" backend/.env.development
```

## 2. 프로젝트 구조 검증

### 📁 파일 경로 확인
- [ ] `frontend/src/components/UnifiedLeaveOverview.tsx` 존재 여부
- [ ] `frontend/src/services/api.ts` 존재 여부
- [ ] `frontend/src/components/AuthProvider.tsx` 존재 여부
- [ ] `frontend/src/components/NotificationProvider.tsx` 존재 여부

### 🔍 확인 명령어
```bash
# 컴포넌트 파일 확인
ls -la frontend/src/components/UnifiedLeaveOverview.tsx
ls -la frontend/src/components/AuthProvider.tsx
ls -la frontend/src/components/NotificationProvider.tsx

# API 서비스 파일 확인
ls -la frontend/src/services/api.ts
```

## 3. API 엔드포인트 검증

### 🌐 실제 API 경로 확인
- [ ] `/api/admin/leave/overview` - Admin 전용 휴가 현황
- [ ] `/api/leave/team-status` - 팀 현황
- [ ] `/api/leave/team-status/department-stats` - 부서 통계
- [ ] `/api/auth/login` - 로그인
- [ ] `/api/departments` - 부서 목록

### 🔍 확인 명령어
```bash
# 백엔드 라우트 확인
grep -r "router.get\|router.post" backend/routes/leave.js
grep -r "router.get\|router.post" backend/routes/auth.js
grep -r "'/admin/leave/overview'" backend/
```

## 4. 테스트 의존성 검증

### 📦 패키지 확인
- [ ] Jest 설치 여부
- [ ] React Testing Library 설치 여부
- [ ] TypeScript 테스트 설정

### 🔍 확인 명령어
```bash
# 테스트 패키지 확인
grep "@testing-library/react\|jest" frontend/package.json
grep "test" frontend/package.json

# Jest 설정 파일 확인
ls -la frontend/jest.config.js
ls -la frontend/src/setupTests.ts
```

## 5. 데이터베이스 설정 검증

### 🗄️ MongoDB 설정
- [ ] 개발 DB: `SM_nomu`
- [ ] 테스트 DB: `SM_nomu_test` (분리 필요)
- [ ] Collection 이름 확인

### 🔍 확인 명령어
```bash
# DB 이름 확인
grep "DB_NAME" backend/.env.development
grep -r "db.collection" backend/

# Collection 이름 확인
grep -r "collection('users')\|collection('leave" backend/
```

## 6. 인증 방식 검증

### 🔐 JWT 토큰 설정
- [ ] JWT_SECRET 환경변수 존재
- [ ] 토큰 발급 엔드포인트 확인
- [ ] 토큰 검증 미들웨어 확인

### 🔍 확인 명령어
```bash
# JWT 설정 확인
grep "JWT_SECRET" backend/.env.development
grep -r "jsonwebtoken\|jwt" backend/
grep -r "requireAuth" backend/middleware/
```

## 7. CLAUDE.md 원칙 준수 확인

### 📋 필수 원칙
- [x] Mock 데이터 사용 금지 ✅
- [x] 실제 MongoDB 데이터 사용 ✅
- [x] TDD 사이클 준수 (Red → Green → Refactor) ✅
- [ ] 한 번에 하나의 테스트만 작성
- [ ] 구조적 변경과 동작 변경 분리

## 8. 테스트 데이터 관리

### 🧹 Cleanup 전략
- [ ] beforeEach/afterEach 훅 사용 계획
- [ ] 테스트 간 데이터 격리 방법
- [ ] 테스트 DB 초기화 스크립트

### 🔍 확인 사항
```bash
# 기존 테스트 파일 참고
find frontend -name "*.test.tsx" -o -name "*.test.ts"
find backend -name "*.test.js"
```

## 9. 실행 가능성 검증

### ⚡ 즉시 실행 가능 여부
- [ ] 모든 필요한 서비스가 실행 중인가?
- [ ] 테스트 실행 명령어가 정확한가?
- [ ] 환경 변수가 올바르게 설정되어 있는가?

### 🔍 실행 전 체크
```bash
# 서비스 상태 확인
curl http://localhost:5455/health
curl http://localhost:3727  # Frontend

# MongoDB 연결 확인
mongosh --eval "db.adminCommand('ping')"
```

## 10. 타입 정의 확인

### 📝 TypeScript 타입
- [ ] UnifiedLeaveOverviewProps 인터페이스 정의
- [ ] EmployeeLeaveOverview 타입 정의
- [ ] API 응답 타입 정의

### 🔍 확인 명령어
```bash
# 타입 정의 확인
grep -r "interface.*Props\|type.*Props" frontend/src/components/UnifiedLeaveOverview.tsx
grep -r "interface EmployeeLeaveOverview" frontend/
```

---

## 🚨 발견된 문제점

1. ✅ **수정 완료**: 백엔드 포트 3838 → 5455
2. **확인 필요**: 프론트엔드 개발 서버 포트
3. **확인 필요**: 실제 API 엔드포인트 경로
4. **확인 필요**: 테스트 라이브러리 설치 여부
5. **확인 필요**: 테스트 DB 분리 전략

## 📌 다음 단계

1. 위 체크리스트의 각 항목을 확인
2. 발견된 불일치 사항 수정
3. 테스트 환경 설정 파일 작성
4. 첫 번째 테스트 작성 시작