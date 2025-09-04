# Payroll.js 리팩토링 계획 [❌ CANCELLED]

> **상태**: 취소됨 (2025.01.20)
> **취소 이유**: 미사용 코드 정리 후 833줄로 감소. 리팩토링 불필요.

## 📊 코드 정리 결과

### 파일 정보
- **파일**: `backend/routes/payroll.js`
- **현재 크기**: 1,200줄
- **목표**: 5개 모듈로 분할 (각 200-300줄)
- **복잡도**: 높음 (13개 엔드포인트, Enhanced API 포함)

### 현재 구조 분석
```
payroll.js (1,200줄)
├── 기본 CRUD (300줄)
├── Monthly 급여 관리 (350줄)
├── Enhanced API (400줄)
├── 통계 및 분석 (150줄)
```

### 주요 문제점
1. **기능 혼재**: 기본 API와 Enhanced API가 한 파일에 혼재
2. **보안 로직 중복**: 비밀번호 검증, 권한 체크가 여러 곳에 반복
3. **비즈니스 로직 혼재**: 계산 로직이 라우트에 직접 포함
4. **테스트 어려움**: 1,200줄의 단일 파일로 단위 테스트 어려움

## 🎯 리팩토링 목표

### 분할 계획
1. **payroll/basicPayroll.js** (250줄)
   - 기본 CRUD 작업
   - GET, POST, PUT, DELETE /payroll

2. **payroll/monthlyPayroll.js** (300줄)
   - 월별 급여 관리
   - /monthly/:year_month 관련
   - Export 기능

3. **payroll/enhancedPayroll.js** (280줄)
   - Enhanced API
   - 고급 필터링
   - 대량 작업

4. **payroll/payrollStats.js** (200줄)
   - 통계 및 분석
   - 대시보드 데이터
   - 집계 쿼리

5. **payroll/index.js** (50줄)
   - 라우터 통합
   - 공통 미들웨어

6. **payroll/shared/payrollMiddleware.js** (120줄)
   - 권한 검증
   - 비밀번호 재확인
   - 데이터 검증

## 📋 실행 계획

### Phase 1: 준비 및 백업 (30분)
```bash
# 1. 백업 생성
cp backend/routes/payroll.js backend/routes/payroll.js.backup

# 2. 새 디렉토리 구조 생성
mkdir -p backend/routes/payroll/shared

# 3. Git 브랜치 생성
git checkout -b refactor/payroll-split
```

### Phase 2: 기본 CRUD 분리 (1시간)
```javascript
// payroll/basicPayroll.js
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../shared/payrollMiddleware');

// 기본 CRUD 엔드포인트 이동
// - GET / (전체 급여 목록)
// - GET /employee/:userId (직원별 급여)
// - POST / (새 급여 레코드 생성)
// - DELETE /:id (급여 레코드 삭제)

module.exports = router;
```

### Phase 3: 월별 급여 관리 분리 (1시간)
```javascript
// payroll/monthlyPayroll.js
const express = require('express');
const router = express.Router();
const { requirePasswordVerification } = require('../shared/payrollMiddleware');

// 월별 급여 엔드포인트 이동
// - GET /monthly/:year_month
// - POST /monthly
// - PUT /monthly/:id (Admin 전용, 비밀번호 재확인)
// - DELETE /monthly/:id
// - GET /monthly/:year_month/export

module.exports = router;
```

### Phase 4: Enhanced API 분리 (1시간)
```javascript
// payroll/enhancedPayroll.js
const express = require('express');
const router = express.Router();

// Enhanced API 엔드포인트 이동
// - GET /enhanced (고급 필터링)
// - POST /enhanced (대량 생성)
// - PUT /enhanced/:id (대량 수정)
// - DELETE /enhanced/:id (대량 삭제)

module.exports = router;
```

### Phase 5: 통계 API 분리 (45분)
```javascript
// payroll/payrollStats.js
const express = require('express');
const router = express.Router();

// 통계 엔드포인트 이동
// - GET /stats/:yearMonth
// - GET /csrf-token (CSRF 토큰 생성)

module.exports = router;
```

### Phase 6: 공통 미들웨어 추출 (45분)
```javascript
// payroll/shared/payrollMiddleware.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 권한 검증 미들웨어
const requirePermission = (permission) => { /* ... */ };

// 비밀번호 재확인 미들웨어
const requirePasswordVerification = async (req, res, next) => { /* ... */ };

// Admin 권한 체크
const requireAdmin = (req, res, next) => { /* ... */ };

// 급여 데이터 검증
const validatePayrollData = (req, res, next) => { /* ... */ };

// 급여 계산 로직
const calculatePayroll = (data) => { /* ... */ };

module.exports = {
  requirePermission,
  requirePasswordVerification,
  requireAdmin,
  validatePayrollData,
  calculatePayroll
};
```

### Phase 7: 통합 라우터 생성 (30분)
```javascript
// payroll/index.js
const express = require('express');
const router = express.Router();

const basicPayroll = require('./basicPayroll');
const monthlyPayroll = require('./monthlyPayroll');
const enhancedPayroll = require('./enhancedPayroll');
const payrollStats = require('./payrollStats');

// 하위 라우터 연결
router.use('/', basicPayroll);
router.use('/monthly', monthlyPayroll);
router.use('/enhanced', enhancedPayroll);
router.use('/stats', payrollStats);

module.exports = (db) => {
  // DB 인스턴스를 각 모듈에 전달
  basicPayroll.locals = { db };
  monthlyPayroll.locals = { db };
  enhancedPayroll.locals = { db };
  payrollStats.locals = { db };
  
  return router;
};
```

### Phase 8: Server.js 업데이트 (15분)
```javascript
// server.js 수정
const payrollRoutes = require('./routes/payroll');
app.use('/api/payroll', payrollRoutes(db));
```

### Phase 9: 테스트 및 검증 (1시간 30분)
```bash
# 1. 각 엔드포인트 테스트
npm test -- tests/integration/payroll-enhanced-api.test.js

# 2. Admin 편집 기능 테스트 (비밀번호 재확인)
./test-payroll-admin-edit.sh

# 3. Enhanced API 테스트
./test-enhanced-api.sh

# 4. 통계 API 테스트
curl http://localhost:5456/api/payroll/stats/2025_01
```

### Phase 10: 정리 및 문서화 (30분)
- API 문서 업데이트
- FUNCTIONS_VARIABLES.md 업데이트
- 00-REFACTORING-INDEX.md 업데이트
- 리팩토링 완료 보고서 작성

## ⏱️ 예상 소요 시간

- **총 소요 시간**: 7시간
- **작업 일정**: 1-2일 (중간 테스트 포함)

## 🚨 주의사항

1. **비밀번호 재확인 기능 유지**
   - Admin 급여 수정 시 비밀번호 재확인 필수
   - 5분 유효 임시 토큰 시스템 유지

2. **Enhanced API 호환성**
   - 기존 Enhanced API 경로 유지
   - 필터링 파라미터 동일하게 유지

3. **트랜잭션 처리**
   - 대량 작업 시 트랜잭션 처리 유지
   - 롤백 메커니즘 보존

4. **계산 로직 일관성**
   - 급여 계산 로직을 shared로 추출
   - 모든 모듈에서 동일한 계산 함수 사용

## 📈 예상 효과

1. **유지보수성 향상**: 1,200줄 → 평균 240줄 모듈로 분할
2. **보안 강화**: 보안 미들웨어 중앙 관리
3. **테스트 용이성**: 각 모듈별 단위 테스트 가능
4. **확장성 개선**: 새 기능 추가 시 독립 모듈로 추가 가능

## 🔄 롤백 계획

문제 발생 시:
```bash
# 1. 백업 파일로 복원
mv backend/routes/payroll.js.backup backend/routes/payroll.js

# 2. 새로 생성된 디렉토리 제거
rm -rf backend/routes/payroll/

# 3. Server.js 원복
git checkout -- backend/server.js

# 4. 브랜치 삭제
git checkout master
git branch -D refactor/payroll-split
```

## ✅ 완료 체크리스트

- [ ] Phase 1: 백업 및 준비
- [ ] Phase 2: 기본 CRUD 분리
- [ ] Phase 3: 월별 급여 관리 분리
- [ ] Phase 4: Enhanced API 분리
- [ ] Phase 5: 통계 API 분리
- [ ] Phase 6: 공통 미들웨어 추출
- [ ] Phase 7: 통합 라우터 생성
- [ ] Phase 8: Server.js 업데이트
- [ ] Phase 9: 테스트 및 검증
- [ ] Phase 10: 문서화 완료

## 🔗 연관 작업

- **이전 리팩토링**: 07-reports-refactoring-plan.md
- **다음 예정**: ErrorLoggingMonitoringService 리팩토링
- **관련 문서**: 
  - completed/payroll-admin-edit-security-plan-updated.md
  - completed/payroll-enhanced-refactoring-plan-original.md

---

**작성일**: 2025년 1월 20일
**작성자**: Claude
**상태**: 계획 수립 완료