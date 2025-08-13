# Admin.js 분할 구현 계획 (Option 1: 완전 분할)

## 🎯 목표
admin.js (1,873 라인)를 5개의 관리 가능한 파일로 분할하여 유지보수성 향상

## 📁 최종 파일 구조
```
backend/routes/
├── admin.js                    # 라우터 통합 (약 200줄)
├── admin/
│   ├── leaveAdmin.js           # 휴가 관리 (약 600줄)
│   ├── systemAdmin.js          # 시스템 관리 (약 500줄)
│   ├── logsAdmin.js            # 로그 관리 (약 400줄)
│   ├── capacityAdmin.js        # 용량 관리 (약 300줄)
│   └── shared/
│       └── adminMiddleware.js  # 공통 미들웨어 (약 100줄)
```

## 📊 현재 라우트 분석 및 분류

### Leave Admin Routes (8개)
- `/leave/overview` - 휴가 개요 조회 (line 58-189)
- `/leave/adjust` - 휴가 조정 (line 192-279)
- `/leave/employee/:id` - 특정 직원 휴가 조회 (line 282-382)
- `/leave/bulk-pending` - 대기중인 휴가 요청 목록 (line 678-743)
- `/leave/bulk-approve` - 일괄 승인/거부 (line 746-854)

### System Admin Routes (3개)
- `/stats/system` - 시스템 통계 (line 385-458)
- `/policy` - 정책 조회 (line 461-528)
- `/policy` (PUT) - 정책 수정 (line 531-638)
- `/policy/history` - 정책 변경 이력 (line 641-675)
- `/migrate-users-isactive` - 사용자 마이그레이션 (line 857-985)

### Capacity Admin Routes (5개)
- `/debug/temp-uploads` - 임시 업로드 디버그 (line 988-1032)
- `/dashboard/temp-data` - 임시 데이터 대시보드 (line 1035-1186)
- `/capacity/status` - 용량 상태 (line 1189-1287)
- `/capacity/cleanup` - 용량 정리 (line 1290-1406)
- `/capacity/policy` - 용량 정책 (line 1409-1502)

### Logs Admin Routes (4개)
- `/logs/query` - 로그 조회 (line 1505-1581)
- `/logs/stats` - 로그 통계 (line 1584-1702)
- `/logs/export` - 로그 내보내기 (line 1705-1790)
- `/logs/cleanup` - 로그 정리 (line 1793-1870)

## 🔄 구현 단계

### Phase 1: 준비 작업 (30분) ✅
- [x] 1.1 백업 생성
  ```bash
  cp backend/routes/admin.js backend/routes/admin.js.backup
  git add backend/routes/admin.js.backup
  git commit -m "backup: Save admin.js before refactoring"
  ```

- [x] 1.2 테스트 환경 준비
  ```bash
  # 개발 서버 시작
  cd backend && npm run dev
  
  # 별도 터미널에서 프론트엔드 시작
  cd frontend && npm run dev
  ```

- [x] 1.3 기본 API 동작 확인
  - 로그인 테스트 (admin/admin)
  - 휴가 관리 페이지 접속 확인
  - 시스템 통계 페이지 확인

### Phase 2: 공통 미들웨어 분리 (30분) ✅
- [x] 2.1 adminMiddleware.js 생성
  ```javascript
  // backend/routes/admin/shared/adminMiddleware.js
  - requirePermission 함수 이동
  - requireAdmin 함수 이동
  - 공통 헬퍼 함수 이동
  ```

- [x] 2.2 테스트
  - 미들웨어 import 확인
  - 권한 체크 동작 확인

### Phase 3: Leave Admin 분리 (1시간) ✅
- [x] 3.1 leaveAdmin.js 생성
  ```javascript
  // backend/routes/admin/leaveAdmin.js
  - 5개 leave 관련 라우트 이동
  - 필요한 import 추가
  - module.exports 설정
  ```

- [x] 3.2 admin.js에서 leaveAdmin 라우터 통합
  ```javascript
  const leaveAdminRoutes = require('./admin/leaveAdmin');
  router.use('/leave', leaveAdminRoutes(db));
  ```

- [x] 3.3 테스트 체크리스트
  - [x] GET /api/admin/leave/overview
  - [x] POST /api/admin/leave/adjust
  - [x] GET /api/admin/leave/employee/:id
  - [x] GET /api/admin/leave/bulk-pending
  - [x] POST /api/admin/leave/bulk-approve

### Phase 4: System Admin 분리 (45분) ✅
- [x] 4.1 systemAdmin.js 생성
  ```javascript
  // backend/routes/admin/systemAdmin.js
  - 시스템 통계 라우트 이동
  - 정책 관련 라우트 이동
  - 마이그레이션 라우트 이동
  ```

- [x] 4.2 admin.js 통합
  ```javascript
  const systemAdminRoutes = require('./admin/systemAdmin');
  router.use('/', systemAdminRoutes(db));
  ```

- [x] 4.3 테스트 체크리스트
  - [x] GET /api/admin/stats/system
  - [x] GET /api/admin/policy
  - [x] PUT /api/admin/policy
  - [x] GET /api/admin/policy/history
  - [x] POST /api/admin/migrate-users-isactive

### Phase 5: Capacity Admin 분리 (45분) ✅
- [x] 5.1 capacityAdmin.js 생성
  ```javascript
  // backend/routes/admin/capacityAdmin.js
  - 용량 관련 라우트 이동
  - 임시 데이터 관련 라우트 이동
  ```

- [x] 5.2 admin.js 통합
  ```javascript
  const capacityAdminRoutes = require('./admin/capacityAdmin');
  router.use('/', capacityAdminRoutes(db));
  ```

- [x] 5.3 테스트 체크리스트
  - [x] GET /api/admin/debug/temp-uploads
  - [x] GET /api/admin/dashboard/temp-data
  - [x] GET /api/admin/capacity/status
  - [x] POST /api/admin/capacity/cleanup
  - [x] POST /api/admin/capacity/policy

### Phase 6: Logs Admin 분리 (45분) ✅
- [x] 6.1 logsAdmin.js 생성
  ```javascript
  // backend/routes/admin/logsAdmin.js
  - 로그 관련 라우트 이동
  ```

- [x] 6.2 admin.js 통합
  ```javascript
  const logsAdminRoutes = require('./admin/logsAdmin');
  router.use('/logs', logsAdminRoutes(db));
  ```

- [x] 6.3 테스트 체크리스트
  - [x] GET /api/admin/logs/query
  - [x] GET /api/admin/logs/stats
  - [x] POST /api/admin/logs/export
  - [x] POST /api/admin/logs/cleanup

### Phase 7: 최종 정리 및 검증 (1시간) ✅
- [x] 7.1 admin.js 최종 구조 확인
  ```javascript
  // backend/routes/admin.js (최종 - 약 200줄)
  const express = require('express');
  const router = express.Router();
  
  function createAdminRoutes(db) {
    const leaveAdminRoutes = require('./admin/leaveAdmin');
    const systemAdminRoutes = require('./admin/systemAdmin');
    const capacityAdminRoutes = require('./admin/capacityAdmin');
    const logsAdminRoutes = require('./admin/logsAdmin');
    
    router.use('/leave', leaveAdminRoutes(db));
    router.use('/', systemAdminRoutes(db));
    router.use('/', capacityAdminRoutes(db));
    router.use('/logs', logsAdminRoutes(db));
    
    return router;
  }
  
  module.exports = createAdminRoutes;
  ```

- [x] 7.2 전체 기능 테스트
  - [x] Frontend 전체 페이지 네비게이션
  - [x] 권한별 접근 테스트 (Admin, Supervisor, User)
  - [x] 에러 처리 확인

- [x] 7.3 성능 검증
  - [x] 응답 시간 비교
  - [x] 메모리 사용량 확인
  - [x] 동시 요청 처리 테스트

### Phase 8: 배포 준비 (30분)
- [x] 8.1 코드 리뷰
  - [x] Import 최적화
  - [x] 불필요한 코드 제거
  - [x] 주석 정리

- [ ] 8.2 문서 업데이트
  - [ ] FUNCTIONS_VARIABLES.md 업데이트
  - [ ] API 문서 업데이트

- [ ] 8.3 최종 커밋
  ```bash
  git add backend/routes/admin/
  git add backend/routes/admin.js
  git commit -m "refactor: Split admin.js into modular components
  
  - leaveAdmin.js: Leave management routes
  - systemAdmin.js: System and policy management
  - capacityAdmin.js: Capacity and temp data management
  - logsAdmin.js: Logging system routes
  - adminMiddleware.js: Shared middleware functions"
  ```

## ⚠️ 롤백 계획

문제 발생 시 즉시 롤백:
```bash
# 1. 변경사항 되돌리기
git checkout HEAD -- backend/routes/

# 2. 백업 파일로 복원
cp backend/routes/admin.js.backup backend/routes/admin.js

# 3. 서버 재시작
pm2 restart backend
```

## 📝 체크포인트

각 Phase 완료 후 확인:
1. ✅ 모든 API 엔드포인트 정상 동작
2. ✅ Frontend 페이지 정상 로드
3. ✅ 콘솔에 에러 없음
4. ✅ 네트워크 요청 성공 (200/201 응답)
5. ✅ 데이터 정상 표시

## 🎯 성공 기준

- [x] 모든 기존 기능 100% 동작
- [x] 파일 크기: 각 파일 600줄 이하
- [x] 테스트 커버리지 유지
- [x] 성능 저하 없음
- [x] 코드 가독성 향상

## 📊 예상 소요 시간

- 총 소요 시간: 5-6시간
- 실제 코딩: 3-4시간
- 테스트 및 검증: 2시간

## 🚀 다음 단계

Phase 1부터 순차적으로 진행하며, 각 단계 완료 후 체크포인트 확인 필수!