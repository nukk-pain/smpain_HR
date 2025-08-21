# Reports.js 미사용 엔드포인트 제거 계획

## 현재 상황 분석

### 사용 중인 엔드포인트 (유지)
1. ✅ `GET /api/reports/payroll/:year_month` - PayrollDashboard에서 사용
2. ✅ `POST /api/reports/payslip/match-employees` - PayslipBulkUpload에서 사용
3. ✅ `POST /api/reports/payslip/bulk-upload` - PayslipBulkUpload에서 사용
4. ✅ `GET /api/reports/payslip/download/:documentId` - PDF 다운로드용
5. ✅ `GET /api/reports/payslip/upload-history` - PayslipBulkUpload에서 사용

### 제거할 엔드포인트 (미사용)
1. ❌ `GET /api/reports/payroll/:year_month/excel` - Line 242
2. ❌ `GET /api/reports/comparison/:upload_id/:year_month/excel` - Line 265
3. ❌ `GET /api/reports/payslip/:userId/:year_month/excel` - Line 294
4. ❌ `GET /api/reports/leave/:year_month` - Line 339
5. ❌ `POST /api/reports/payroll/:id/payslip/upload` - Line 420
6. ❌ `GET /api/reports/payroll/:id/payslip` - Line 542
7. ❌ `DELETE /api/reports/payroll/:id/payslip` - Line 645

## 작업 계획

### Phase 1: Backend 정리
1. reports.js에서 미사용 엔드포인트 제거
2. 관련 헬퍼 함수 제거 (사용되지 않는 경우)
3. 불필요한 import 제거

### Phase 2: Frontend 정리
1. api.ts에서 미사용 메서드 제거:
   - `getPayrollExcelReport()`
   - `getComparisonExcelReport()`
   - `getPayslipExcelReport()`
2. endpoints.ts에서 미사용 엔드포인트 제거
3. constants.ts에서 미사용 상수 제거

### Phase 3: 테스트 및 검증
1. 남은 엔드포인트 동작 확인
2. PayrollDashboard 테스트
3. PayslipBulkUpload 테스트

## 예상 결과
- reports.js: 1,280줄 → 약 600줄 (53% 감소)
- 코드 가독성 향상
- 유지보수성 개선