# Payroll Enhanced 리팩토링 Step-by-Step 실행 계획

> **참조 문서**: `/mnt/d/my_programs/HR/01-payroll-enhanced-refactoring-plan-original.md`
> 
> 이 문서는 위 원본 계획을 기반으로 한 단계별 실행 가이드입니다.

## 전체 개요

**목표**: `payroll-enhanced.js` (113KB, 3,150라인)을 기존 파일 4개에 분산하여 관리 가능한 크기로 만들기

**전략**: 기존 파일 재활용 + 최소한의 새 파일 생성 (원본 계획 참조)

## 실행 단계

> **전략 업데이트**: "Payroll-Enhanced 먼저, Admin.js 나중에" 전략 채택
> - admin.js 분할을 미루고 adminPayroll.js 별도 파일 생성
> - 위험 최소화와 빠른 구현 우선

### Phase 1: 준비 작업 (위험도: 매우 낮음) ✅

#### Step 1.1: 공통 유틸리티 파일 생성 ✅
**파일**: `/backend/utils/payrollUtils.js`
**예상 작업 시간**: 30분
**원본 계획 참조**: Section 3 - 공통 유틸리티 분리

**작업 내용**:
```bash
# 1. 파일 생성
touch /backend/utils/payrollUtils.js

# 2. payroll-enhanced.js에서 이동할 내용:
# - Configuration 객체들 (라인 62-94)
# - Memory management functions (라인 97-247)
# - JWT preview token utilities (라인 313-376)
# - CSRF token utilities (라인 378-463)
# - File system backup utilities (라인 466-595)
# - Data masking/security functions (라인 599-759)
```

**완료 기준**:
- [x] payrollUtils.js 파일 생성 완료
- [x] 모든 configuration 상수들 이동
- [x] 메모리 관리 함수들 이동
- [x] 토큰 관련 유틸리티 이동
- [x] 백업 관련 유틸리티 이동
- [x] 데이터 마스킹 함수들 이동
- [x] 유틸리티 함수들 정상 export
- [x] ESLint/TypeScript 오류 없음

#### Step 1.2: 유틸리티 함수 테스트 ✅
**작업 내용**:
```bash
# 각 기존 파일에서 payrollUtils import 테스트
node -e "console.log(require('./backend/utils/payrollUtils'))"
```

**완료 기준**:
- [x] Import 오류 없음
- [x] 모든 export된 함수들이 정상 작동

---

### Phase 2: reports.js 확장 (위험도: 낮음) ✅

#### Step 2.1: Payslip 관리 기능 추가 ✅
**파일**: `/backend/routes/reports.js`
**예상 작업 시간**: 45분
**원본 계획 참조**: Section 2.D - reports.js 확장 (343 라인 → 실제 690 라인)

**작업 내용**:
```javascript
// payroll-enhanced.js에서 이동할 라우트들:
// - POST /:id/payslip/upload (라인 2538-2612)
// - GET /:id/payslip (라인 2664-2728)  
// - DELETE /:id/payslip (라인 2759-2823)
```

**완료 기준**:
- [x] 3개 payslip 라우트 추가 완료
- [x] payrollUtils.js import 추가
- [x] 기존 기능 정상 작동 확인
- [x] 새 기능 정상 작동 확인

#### Step 2.2: reports.js 테스트 ✅
**작업 내용**:
```bash
# API 테스트
curl -X GET http://localhost:5000/api/reports/test
curl -X POST http://localhost:5000/api/reports/123/payslip/upload
```

**완료 기준**:
- [x] 기존 API 엔드포인트 정상 작동
- [x] 새로 추가된 API 엔드포인트 정상 작동
- [x] 오류 로그 없음

---

### Phase 3: adminPayroll.js 생성 (위험도: 낮음) ✅
**전략 변경**: admin.js 분할 대신 별도 파일 추가 방식 채택

#### Step 3.1: adminPayroll.js 파일 생성 ✅
**파일**: `/backend/routes/adminPayroll.js`
**예상 작업 시간**: 45분
**원본 계획 수정**: admin.js를 건드리지 않고 새 파일만 추가
**실제 결과**: 385 라인

**작업 내용**:
```javascript
// payroll-enhanced.js에서 이동할 admin 관련 라우트들:
// - GET /debug/memory (라인 2858-2936)
// - GET /rollback/status/:operationId (라인 3004-3039)
// - POST /rollback/execute (라인 3044-3116)
// - DELETE /rollback/cleanup (라인 3121-3150)

// 새 파일 구조:
// backend/routes/adminPayroll.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/errorHandler');
const { memoryUtils, rollbackUtils } = require('../utils/payrollUtils');

function createAdminPayrollRoutes(db) {
  // Debug memory endpoint
  router.get('/debug/memory', requireAuth, requireAdmin, async (req, res) => {
    // 구현
  });
  
  // Rollback endpoints
  router.get('/rollback/status/:operationId', requireAuth, requireAdmin, async (req, res) => {
    // 구현
  });
  
  return router;
}

module.exports = createAdminPayrollRoutes;
```

**server.js 수정**:
```javascript
// 기존 admin 라우트는 그대로 유지
app.use('/api/admin', adminRoutes(db));

// 새로운 payroll admin 라우트 추가
const adminPayrollRoutes = require('./routes/adminPayroll');
app.use('/api/admin/payroll', adminPayrollRoutes(db));
```

**완료 기준**:
- [x] adminPayroll.js 파일 생성
- [x] payroll-enhanced.js에서 4개 admin 라우트 복사
- [x] payrollUtils.js import 추가
- [x] server.js에 라우트 추가
- [x] 기존 admin.js는 수정하지 않음

#### Step 3.2: adminPayroll.js 테스트 ✅
**작업 내용**:
```bash
# 새로운 경로로 테스트 (주의: /api/admin/payroll 경로)
curl -X GET http://localhost:5000/api/admin/payroll/debug/memory

# 롤백 기능 테스트  
curl -X GET http://localhost:5000/api/admin/payroll/rollback/status/test123
```

**완료 기준**:
- [x] 기존 /api/admin/* API들 정상 작동 (변경 없음)
- [x] 새로운 /api/admin/payroll/debug/memory API 정상 작동
- [x] 새로운 /api/admin/payroll/rollback/* API 정상 작동
- [x] admin.js 수정 없이 완료

---

### Phase 4: upload.js 확장 (위험도: 중간) ✅

#### Step 4.1: Excel Preview/Confirm 기능 추가 ✅
**파일**: `/backend/routes/upload.js`  
**예상 작업 시간**: 90분
**원본 계획 참조**: Section 2.B - upload.js 확장 (378 라인 → 실제 896 라인)

**작업 내용**:
```javascript
// payroll-enhanced.js에서 이동할 라우트들:
// - POST /excel/preview (라인 1332-1700)
// - POST /excel/confirm (라인 1701-2189) 
// - GET /excel/template (라인 2461-2537)
// - GET /excel/export (라인 2327-2460)
```

**완료 기준**:
- [x] 4개 excel 처리 라우트 추가 완료
- [x] payrollUtils.js import 추가
- [x] ExcelService 연동 확인
- [x] 기존 upload 기능 정상 작동 확인
- [x] 새 excel 기능 정상 작동 확인

#### Step 4.2: Excel 처리 통합 테스트 ✅
**작업 내용**:
```bash
# Excel 파일 업로드 테스트
curl -X POST http://localhost:5000/api/upload/excel/preview \
  -F "file=@test.xlsx"

# Excel 템플릿 다운로드 테스트
curl -X GET http://localhost:5000/api/upload/excel/template
```

**완료 기준**:
- [x] 기존 upload API 정상 작동
- [x] Excel preview/confirm 플로우 정상 작동
- [x] 파일 처리 성능 이슈 없음
- [x] 메모리 사용량 정상 범위

---

### Phase 5: payroll.js 확장 (위험도: 높음) ✅

#### Step 5.1: Enhanced CRUD 기능 추가 ✅
**파일**: `/backend/routes/payroll.js`
**예상 작업 시간**: 120분
**원본 계획 참조**: Section 2.A - payroll.js 확장 (425 라인 → 실제 770 라인)

**작업 내용**:
```javascript
// payroll-enhanced.js에서 이동할 라우트들:
// - GET /csrf-token (라인 772-843)
// - POST / enhanced validation (라인 844-912)
// - GET / advanced filtering (라인 913-1012)
// - GET /:id enhanced (라인 1013-1101)  
// - PUT /:id enhanced (라인 1102-1177)
// - DELETE /:id enhanced (라인 1178-1331)
```

**완료 기준**:
- [x] CSRF token endpoint 추가
- [x] Enhanced CRUD validation 추가
- [x] Advanced filtering/pagination 추가
- [x] payrollUtils.js import 추가
- [x] 기존 payroll 기능 정상 작동 확인
- [x] 새 enhanced 기능 정상 작동 확인

#### Step 5.2: Payroll CRUD 통합 테스트 ✅
**작업 내용**:
```bash
# CSRF 토큰 테스트
curl -X GET http://localhost:5000/api/payroll/csrf-token

# Enhanced CRUD 테스트
curl -X GET "http://localhost:5000/api/payroll?page=1&limit=10&filter=active"
curl -X POST http://localhost:5000/api/payroll -H "Content-Type: application/json" -d '{...}'
```

**완료 기준**:
- [x] 기존 payroll CRUD API 정상 작동
- [x] Enhanced validation 정상 작동
- [x] Advanced filtering 정상 작동  
- [x] CSRF protection 정상 작동
- [x] 성능 저하 없음

---

### Phase 6: 통합 및 정리 (위험도: 낮음) ✅

#### Step 6.1: 모든 파일에 payrollUtils 통합 ✅
**예상 작업 시간**: 30분

**작업 내용**:
```bash
# 각 파일에서 중복된 코드를 payrollUtils 사용으로 교체
# - payroll.js
# - upload.js  
# - adminPayroll.js (admin.js는 수정하지 않음)
# - reports.js
```

**완료 기준**:
- [x] 4개 파일에서 payrollUtils.js import
- [x] 중복 코드 제거 완료
- [x] 모든 API 정상 작동 확인
- [x] admin.js는 수정하지 않음

#### Step 6.2: payroll-enhanced.js 사용 중단 준비 ✅
**작업 내용**:
```bash
# server.js에서 payroll-enhanced.js import 제거 준비
# (실제 제거는 Step 6.3에서)
grep -n "payroll-enhanced" backend/server.js
```

**완료 기준**:
- [x] server.js에서 payroll-enhanced 사용 위치 확인
- [x] 대체 방안 준비 완료

#### Step 6.3: payroll-enhanced.js 제거 ✅
**작업 내용**:
```bash
# server.js에서 payroll-enhanced 라인 제거
# 실제 파일 삭제
rm backend/routes/payroll-enhanced.js
```

**완료 기준**:
- [x] server.js에서 payroll-enhanced import 제거
- [x] payroll-enhanced.js 파일 삭제
- [x] 모든 기능 정상 작동 확인

---

### Phase 7: 최종 검증 (위험도: 낮음) ✅

#### Step 7.1: 전체 기능 테스트 ✅
**예상 작업 시간**: 60분

**작업 내용**:
```bash
# 모든 API 엔드포인트 테스트
npm test
./test-all-apis.sh
```

**테스트 체크리스트**:
- [x] `/api/payroll/*` - 모든 payroll CRUD 기능
- [x] `/api/upload/*` - 모든 Excel 처리 기능
- [x] `/api/admin/*` - 모든 admin/debug 기능  
- [x] `/api/reports/*` - 모든 report/payslip 기능

#### Step 7.2: 성능 및 메모리 검증 ✅
**작업 내용**:
```bash
# 메모리 사용량 체크
curl -X GET http://localhost:5000/api/admin/debug/memory

# 응답 시간 체크
time curl -X GET http://localhost:5000/api/payroll
```

**완료 기준**:
- [x] 메모리 사용량 개선 확인
- [x] 응답 시간 저하 없음
- [x] 오류 로그 없음

#### Step 7.3: 문서 업데이트 ✅
**작업 내용**:
- [x] API 문서 업데이트 (변경사항 없음 확인)
- [x] 개발자 가이드 업데이트  
- [x] 리팩토링 완료 보고서 작성

---

## 위험 관리

### 백업 계획:
```bash
# 작업 전 전체 백업
cp -r backend/routes backend/routes_backup_$(date +%Y%m%d)
```

### 롤백 계획:
각 Phase별로 git commit하여 단계별 롤백 가능

### 응급 복구:
```bash
# 문제 발생 시 payroll-enhanced.js 즉시 복구
git checkout HEAD~1 backend/routes/payroll-enhanced.js
```

## 예상 전체 소요 시간 (수정됨)

- **Phase 1**: 1시간 (payrollUtils.js 생성)
- **Phase 2**: 1.5시간 (reports.js 확장)
- **Phase 3**: 1시간 (adminPayroll.js 생성 - 간소화됨)
- **Phase 4**: 3시간 (upload.js 확장)
- **Phase 5**: 4시간 (payroll.js 확장)
- **Phase 6**: 1.5시간 (통합 및 정리)
- **Phase 7**: 2시간 (최종 검증)

**총 예상 시간**: **14시간** (2일 작업)

**시간 단축 이유**:
- admin.js 분할 제외 (-1시간)
- adminPayroll.js 단순 생성으로 대체

## 성공 지표

- ✅ payroll-enhanced.js 파일 제거 완료
- ✅ 모든 API 기능 정상 작동
- ✅ 성능 저하 없음  
- ✅ 메모리 사용량 개선
- ✅ 코드 중복 제거
- ✅ 유지보수성 향상

## 원본 계획과의 정합성 (수정됨)

이 실행 계획은 `/mnt/d/my_programs/HR/01-payroll-enhanced-refactoring-plan-original.md`를 기반으로 하되,
`/mnt/d/my_programs/HR/02-refactoring-order-strategy.md`의 전략 결정을 반영합니다:

1. **기존 파일 재활용 우선**: 새 파일 생성 최소화 (payrollUtils.js, adminPayroll.js 2개)
2. **점진적 확장**: 각 파일별로 독립적으로 기능 추가
3. **위험도 관리**: admin.js 분할 제외로 위험 최소화
4. **호환성 보장**: server.js의 기존 import 유지, 새 라우트만 추가
5. **수정된 예상 결과**:
   - payroll.js: 425 → ~800 라인
   - upload.js: 378 → ~900 라인
   - admin.js: 1,873 라인 **유지** (변경 없음)
   - adminPayroll.js: 0 → ~300 라인 (새 파일)
   - reports.js: 343 → ~600 라인
   - payrollUtils.js: 0 → ~400 라인

**주요 변경사항**:
- admin.js 분할 계획 취소 → 미래로 연기
- adminPayroll.js 별도 파일로 대체
- 전체 작업 시간 단축 (15시간 → 14시간)