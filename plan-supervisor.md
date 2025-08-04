# Manager → Supervisor 역할명 변경 계획

## 변경 이유
- "Manager"라는 명칭이 팀 리더로 오해될 수 있음
- 실제 역할은 팀과 무관한 중간관리자
- "Supervisor"가 감독/관리 역할을 더 명확히 표현

## 영향 범위 분석

### 1. 데이터베이스 (MongoDB)
- **users 컬렉션**: `role` 필드에 'manager' 값이 저장됨
- 기존 사용자 데이터 마이그레이션 필요

### 2. Backend (총 7개 파일, 10개 참조)
- **권한 체크**: `role === 'manager'` 형태로 사용
- **주요 파일**:
  - `/backend/routes/users.js` (2개)
  - `/backend/routes/departments.js` (2개)
  - `/backend/routes/leave/leaveCalendar.js` (2개)
  - `/backend/routes/leave/leaveApproval.js` (1개)
  - `/backend/routes/leave/leaveCancellation.js` (1개)
  - `/backend/middleware/validation.js` (1개)
  - `/backend/server.js` (1개)

### 3. Frontend (총 11개 파일, 25개 참조)
- **타입 정의**: `UserRole = 'admin' | 'manager' | 'user'`
- **권한 체크**: `allowedRoles={['admin', 'manager']}`
- **주요 파일**:
  - `/frontend/src/App.tsx` (6개) - 라우트 권한 설정
  - `/frontend/src/types/index.ts` (2개) - 타입 정의
  - `/frontend/src/pages/EmployeeLeaveManagement.tsx` (4개)
  - `/frontend/src/components/DepartmentManagement.tsx` (5개)
  - `/frontend/src/components/UserManagement.tsx` (2개)
  - 기타 컴포넌트들

### 4. 문서 (총 25개 파일, 79개 참조)
- README, PAGES.md, API 문서 등
- 사용자 가이드 및 개발 문서

## 변경 전략

### Phase 1: 백엔드 준비 (하위 호환성 유지)
1. **권한 체크 로직 수정**
   - 기존: `role === 'manager'`
   - 변경: `role === 'manager' || role === 'supervisor'`
   - 두 역할명 모두 허용하여 점진적 마이그레이션 가능

2. **API 응답 변환**
   - 프론트엔드로 전송 시 'manager' → 'supervisor' 자동 변환
   - 프론트엔드에서 받을 때 'supervisor' → 'manager' 자동 변환

### Phase 2: 프론트엔드 변경
1. **타입 정의 업데이트**
   ```typescript
   type UserRole = 'admin' | 'supervisor' | 'user';
   // 임시로 manager도 지원
   type LegacyUserRole = UserRole | 'manager';
   ```

2. **컴포넌트 권한 체크 수정**
   ```typescript
   allowedRoles={['admin', 'supervisor']}
   ```

3. **UI 텍스트 변경**
   - 역할 표시: Manager → Supervisor
   - 메뉴 및 레이블 업데이트

### Phase 3: 데이터 마이그레이션
1. **마이그레이션 스크립트 작성**
   ```javascript
   // scripts/migrate-manager-to-supervisor.js
   db.users.updateMany(
     { role: 'manager' },
     { $set: { role: 'supervisor' } }
   );
   ```

2. **백업 후 실행**
   - 데이터베이스 백업
   - 스크립트 실행
   - 검증

### Phase 4: 정리
1. **하위 호환성 코드 제거**
   - 백엔드의 'manager' 체크 로직 제거
   - 변환 로직 제거

2. **문서 업데이트**
   - 모든 문서에서 Manager → Supervisor 변경
   - API 문서 업데이트

## 상세 변경 파일 목록

### 즉시 변경 필요 (코드)
1. **Backend - 권한 체크 (7개 파일)**
   - `/backend/routes/users.js`
   - `/backend/routes/departments.js`
   - `/backend/routes/leave/leaveCalendar.js`
   - `/backend/routes/leave/leaveApproval.js`
   - `/backend/routes/leave/leaveCancellation.js`
   - `/backend/middleware/validation.js`
   - `/backend/server.js`

2. **Frontend - 타입 및 권한 (11개 파일)**
   - `/frontend/src/types/index.ts` - UserRole 타입
   - `/frontend/src/App.tsx` - 라우트 권한
   - `/frontend/src/components/UserManagement.tsx`
   - `/frontend/src/components/DepartmentManagement.tsx`
   - `/frontend/src/pages/EmployeeLeaveManagement.tsx`
   - `/frontend/src/pages/UserProfile.tsx`
   - `/frontend/src/components/TeamLeaveStatus.tsx`
   - `/frontend/src/components/UnifiedDashboard.tsx`
   - `/frontend/src/config/constants.ts`
   - `/frontend/src/types/config.ts`
   - `/frontend/src/utils/configEnforcer.ts`

3. **데이터베이스 마이그레이션**
   - 새 스크립트: `/scripts/migrate-manager-to-supervisor.js`

### 나중에 변경 (문서)
- `/docs/architecture/PAGES.md`
- `/docs/api/DOCUMENTATION.md`
- `/docs/development/FUNCTIONS_VARIABLES.md`
- 기타 README 및 가이드 문서들

## 예상 위험 및 대응

### 위험 1: 실행 중인 세션
- **문제**: 기존 'manager' 역할로 로그인한 사용자
- **해결**: JWT 토큰의 역할 변환 로직으로 해결

### 위험 2: 외부 시스템 연동
- **문제**: API를 사용하는 외부 시스템이 'manager' 역할 의존
- **해결**: Phase 1의 하위 호환성으로 점진적 마이그레이션

### 위험 3: 하드코딩된 값
- **문제**: 설정 파일이나 환경 변수에 하드코딩
- **해결**: 전체 코드베이스 검색으로 누락 방지

## 실행 순서
1. **백엔드 하위 호환성 추가** (✅ 완료)
   - permissions.js - requireSupervisorOrAdmin 추가
   - validation 스키마 - supervisor 역할 추가
   - leave 라우트 - manager/supervisor 둘 다 지원
   - roleTransform 미들웨어 - 자동 변환 기능
2. **프론트엔드 타입 및 UI 변경** (백엔드 배포 후)
3. **데이터베이스 마이그레이션** (안정화 후)
   - 마이그레이션 스크립트 작성 완료
   - 실행: `cd backend && node ../scripts/migrate-manager-to-supervisor.js`
4. **하위 호환성 제거 및 문서 정리** (마이그레이션 완료 후)

## 테스트 계획
1. **단위 테스트**
   - 권한 체크 로직 테스트
   - 역할 변환 로직 테스트

2. **통합 테스트**
   - 로그인 및 권한 확인
   - API 엔드포인트 접근 테스트
   - UI 역할 표시 확인

3. **마이그레이션 테스트**
   - 테스트 환경에서 먼저 실행
   - 데이터 무결성 확인