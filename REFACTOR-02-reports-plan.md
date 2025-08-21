# Reports.js 리팩토링 계획 [⏸️ HOLD]

> **상태**: 홀드 (2025.01.20)
> **이유**: 12개 엔드포인트 중 4개만 실제 사용 중. 사용하지 않는 코드 정리가 선행되어야 함.

## 📊 현재 상태 분석

### 파일 정보
- **파일**: `backend/routes/reports.js`
- **현재 크기**: 1,280줄
- **목표**: 5개 모듈로 분할 (각 200-350줄)
- **복잡도**: 높음 (12개 엔드포인트, 다양한 기능 혼재)

### 현재 구조 분석
```
reports.js (1,280줄)
├── Payslip 업로드/다운로드 (420줄)
├── Excel 내보내기 (180줄)
├── 휴가 보고서 (150줄)
├── 급여 보고서 (200줄)
├── 매칭 및 대량 업로드 (330줄)
```

### 주요 문제점
1. **단일 책임 원칙 위반**: 보고서, 파일 업로드, Excel 처리가 혼재
2. **코드 중복**: 파일 처리 로직이 여러 곳에 반복
3. **낮은 재사용성**: 유틸리티 함수들이 라우트 내부에 포함
4. **테스트 어려움**: 1,280줄의 단일 파일로 단위 테스트 어려움

## 🎯 리팩토링 목표

### 분할 계획
1. **reports/payslipReports.js** (350줄)
   - Payslip 업로드/다운로드
   - 매칭 로직
   - 이력 관리

2. **reports/excelReports.js** (250줄)
   - Excel 내보내기
   - Excel 템플릿 생성
   - 데이터 포맷팅

3. **reports/leaveReports.js** (200줄)
   - 휴가 현황 보고서
   - 휴가 통계
   - 휴가 분석

4. **reports/payrollReports.js** (280줄)
   - 급여 보고서
   - 급여 통계
   - 급여 비교 분석

5. **reports/index.js** (50줄)
   - 라우터 통합
   - 공통 미들웨어

6. **reports/shared/reportUtils.js** (150줄)
   - 공통 유틸리티
   - 데이터 변환
   - 파일 처리 헬퍼

## 📋 실행 계획

### Phase 1: 준비 및 백업 (30분)
```bash
# 1. 백업 생성
cp backend/routes/reports.js backend/routes/reports.js.backup

# 2. 새 디렉토리 구조 생성
mkdir -p backend/routes/reports/shared

# 3. Git 브랜치 생성
git checkout -b refactor/reports-split
```

### Phase 2: Payslip 관련 분리 (1시간)
```javascript
// reports/payslipReports.js
const express = require('express');
const router = express.Router();

// Payslip 업로드 엔드포인트들 이동
// - POST /payroll/:id/payslip/upload
// - GET /payroll/:id/payslip
// - DELETE /payroll/:id/payslip
// - POST /payslip/match-employees
// - GET /payslip/upload-history
// - POST /payslip/bulk-upload
// - GET /payslip/download/:documentId

module.exports = router;
```

### Phase 3: Excel 관련 분리 (45분)
```javascript
// reports/excelReports.js
const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();

// Excel 내보내기 엔드포인트들 이동
// - GET /payroll/:year_month/excel
// - GET /comparison/:upload_id/:year_month/excel
// - GET /payslip/:userId/:year_month/excel

module.exports = router;
```

### Phase 4: 휴가 보고서 분리 (30분)
```javascript
// reports/leaveReports.js
const express = require('express');
const router = express.Router();

// 휴가 보고서 엔드포인트 이동
// - GET /leave/:year_month

module.exports = router;
```

### Phase 5: 급여 보고서 분리 (45분)
```javascript
// reports/payrollReports.js
const express = require('express');
const router = express.Router();

// 급여 보고서 엔드포인트 이동
// - GET /payroll/:year_month

module.exports = router;
```

### Phase 6: 공통 유틸리티 추출 (30분)
```javascript
// reports/shared/reportUtils.js
const crypto = require('crypto');
const path = require('path');

// 공통 함수들 추출
const generateUniqueId = () => { /* ... */ };
const parseEmployeeFromFilename = () => { /* ... */ };
const extractYearMonth = () => { /* ... */ };
const formatExcelData = () => { /* ... */ };

module.exports = {
  generateUniqueId,
  parseEmployeeFromFilename,
  extractYearMonth,
  formatExcelData
};
```

### Phase 7: 통합 라우터 생성 (30분)
```javascript
// reports/index.js
const express = require('express');
const router = express.Router();

const payslipReports = require('./payslipReports');
const excelReports = require('./excelReports');
const leaveReports = require('./leaveReports');
const payrollReports = require('./payrollReports');

// 하위 라우터 연결
router.use('/payslip', payslipReports);
router.use('/excel', excelReports);
router.use('/leave', leaveReports);
router.use('/payroll', payrollReports);

module.exports = (db) => {
  // DB 인스턴스를 각 모듈에 전달
  payslipReports.locals = { db };
  excelReports.locals = { db };
  leaveReports.locals = { db };
  payrollReports.locals = { db };
  
  return router;
};
```

### Phase 8: Server.js 업데이트 (15분)
```javascript
// server.js 수정
const reportsRoutes = require('./routes/reports');
app.use('/api/reports', reportsRoutes(db));
```

### Phase 9: 테스트 및 검증 (1시간)
```bash
# 1. 각 엔드포인트 테스트
npm test -- tests/integration/reports.test.js

# 2. API 테스트
./test-reports-api.sh

# 3. TypeScript 컴파일 확인
npx tsc --noEmit
```

### Phase 10: 정리 및 문서화 (30분)
- README 업데이트
- API 문서 갱신
- FUNCTIONS_VARIABLES.md 업데이트
- 리팩토링 완료 보고서 작성

## ⏱️ 예상 소요 시간

- **총 소요 시간**: 6시간
- **작업 일정**: 1-2일 (중간 테스트 포함)

## 🚨 주의사항

1. **API 경로 변경 주의**
   - 기존: `/api/reports/payroll/:year_month`
   - 변경 후: 동일하게 유지 (내부 구조만 변경)

2. **데이터베이스 접근**
   - 모든 하위 모듈이 db 인스턴스 접근 가능하도록 설정

3. **의존성 관리**
   - 각 모듈별 필요한 패키지만 import
   - 순환 의존성 방지

4. **에러 처리**
   - 기존 에러 처리 로직 유지
   - asyncHandler 미들웨어 일관성 있게 사용

## 📈 예상 효과

1. **유지보수성 향상**: 1,280줄 → 평균 250줄 모듈로 분할
2. **테스트 용이성**: 각 모듈별 단위 테스트 가능
3. **재사용성 증가**: 공통 유틸리티 분리로 중복 제거
4. **확장성 개선**: 새 보고서 타입 추가 시 독립 모듈로 추가 가능

## 🔄 롤백 계획

문제 발생 시:
```bash
# 1. 백업 파일로 복원
mv backend/routes/reports.js.backup backend/routes/reports.js

# 2. 새로 생성된 디렉토리 제거
rm -rf backend/routes/reports/

# 3. Server.js 원복
git checkout -- backend/server.js

# 4. 브랜치 삭제
git checkout master
git branch -D refactor/reports-split
```

## ✅ 완료 체크리스트

- [ ] Phase 1: 백업 및 준비
- [ ] Phase 2: Payslip 모듈 분리
- [ ] Phase 3: Excel 모듈 분리
- [ ] Phase 4: Leave 모듈 분리
- [ ] Phase 5: Payroll 모듈 분리
- [ ] Phase 6: 공통 유틸리티 추출
- [ ] Phase 7: 통합 라우터 생성
- [ ] Phase 8: Server.js 업데이트
- [ ] Phase 9: 테스트 및 검증
- [ ] Phase 10: 문서화 완료

## 🔴 실제 사용 현황 분석 (2025.01.20 추가)

### 사용 중인 엔드포인트 (4개)
- ✅ GET /api/reports/payroll/:year_month - PayrollDashboard 통계
- ✅ POST /api/reports/payslip/match-employees - PDF 직원 매칭
- ✅ POST /api/reports/payslip/bulk-upload - 급여명세서 일괄 업로드
- ✅ GET /api/reports/payslip/download/:documentId - PDF 다운로드

### 미사용 엔드포인트 (8개) - 제거 대상
- ❌ GET /api/reports/payroll/:year_month/excel
- ❌ GET /api/reports/comparison/:upload_id/:year_month/excel
- ❌ GET /api/reports/payslip/:userId/:year_month/excel
- ❌ GET /api/reports/leave/:year_month
- ❌ POST /api/reports/payroll/:id/payslip/upload
- ❌ GET /api/reports/payroll/:id/payslip
- ❌ DELETE /api/reports/payroll/:id/payslip
- ❌ GET /api/reports/payslip/upload-history

### 권장 조치
1. **선행 작업**: 미사용 코드 8개 엔드포인트 제거 (800줄 예상)
2. **남은 코드**: 약 480줄 (리팩토링 불필요)
3. **결론**: 코드 정리 후 재평가 필요

---

**작성일**: 2025년 1월 20일
**작성자**: Claude
**상태**: ⏸️ **HOLD** - 코드 정리 선행 필요