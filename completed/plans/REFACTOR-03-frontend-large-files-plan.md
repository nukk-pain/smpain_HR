# Frontend Large Files Refactoring Plan

## 리팩토링 문서 정보
- **문서 번호**: 09
- **작성일**: 2025년 1월 20일
- **완료일**: 2025년 1월 21일
- **상태**: ✅ 완료
- **우선순위**: HIGH (1000줄 초과 파일 존재)

## Files Exceeding 1000 Lines (Critical Priority) ⚠️
1. **PayrollGrid.tsx** - 1059 lines 
   - 별도 계획 문서: `payroll-grid-refactoring-plan.md`
   - 1000줄 제한 59줄 초과

## Files Approaching 1000 Lines (High Priority - 800-999 lines) ⚠️
2. **UnifiedLeaveOverview.tsx** - 933 lines
3. **PayrollExcelUploadWithPreview.tsx** - 906 lines  
4. **PayslipBulkUpload.tsx** - 886 lines
5. **UnifiedLeaveOverview.backup.tsx** - 865 lines (백업 파일, 삭제 필요)
6. **LeaveManagement.tsx** - 838 lines

## Files with High Complexity (Medium Priority - 700-799 lines) 
7. **DepartmentManagement.tsx** - 797 lines
8. **api.ts** - 726 lines (서비스 레이어)
9. **LeaveCalendar.tsx** - 724 lines
10. **UnifiedDashboard.tsx** - 702 lines

## 현재 진행 중인 작업과의 충돌 여부

### todo-development.md 검토
- **Excel 내보내기 API 구현** (라인 47)
  - UnifiedLeaveOverview.tsx 리팩토링과 연관됨
  - Excel 내보내기 기능이 UnifiedLeaveOverview 컴포넌트에 통합 예정
  - ⚠️ **충돌 가능성**: Excel 기능 구현 후 리팩토링 권장

### 00-REFACTORING-INDEX.md 검토
- **ErrorLoggingMonitoringService 분할** (백엔드, 진행 예정)
- **Reports.js 분할** (백엔드, HOLD 상태)
- **Payroll.js** (백엔드, CANCELLED)
- ✅ 프론트엔드 리팩토링과 충돌 없음

## 리팩토링 우선순위 및 전략

### Phase 1: 즉시 실행 (Immediate Actions) ✅ 완료
1. **백업 파일 삭제** ✅
   - [x] `UnifiedLeaveOverview.backup.tsx` 삭제 (865 lines)
   - 완료일: 2025년 1월 21일

2. **PayrollGrid.tsx 리팩토링** ✅ 
   - [x] 별도 계획서 참조: `payroll-grid-refactoring-plan.md`
   - 완료일: 2025년 1월 21일
   - 결과: 1059줄 → 329줄 (69% 감소)

### Phase 2: Excel 기능 구현 후 실행 ✅ 완료
3. **UnifiedLeaveOverview.tsx 리팩토링** ✅
   - [x] Excel 내보내기 기능 구현 완료 후 진행
   - [x] 완료일: 2025년 1월 21일
   - [x] 실제 분할 결과:
     - `UnifiedLeaveOverviewRefactored.tsx` - 메인 컴포넌트 (396 lines)
     - `UnifiedLeaveOverviewTable.tsx` - 테이블 표시 (172 lines)
     - `UnifiedLeaveOverviewFilters.tsx` - 필터링 UI (135 lines)
     - `UnifiedLeaveOverviewExport.tsx` - Excel 내보내기 (140 lines)
     - `UnifiedLeaveOverviewStats.tsx` - 통계 카드 (90 lines)
     - `useUnifiedLeaveData.ts` - 데이터 훅 (216 lines)
     - `UnifiedLeaveOverviewTypes.ts` - 타입 정의 (100 lines)
     - `leaveOverviewUtils.ts` - 유틸리티 함수 (106 lines)
   - **총 결과**: 1003줄 → 396줄 메인 + 959줄 분할 컴포넌트 (평균 120줄)

### Phase 3: 높은 우선순위 리팩토링 ✅ 완료
4. **PayrollExcelUploadWithPreview.tsx** (906 lines) ✅
   - [x] 완료된 분할:
     - `PayrollExcelReader.ts` - Excel 읽기 (200 lines)
     - `PayrollDataValidator.ts` - 검증 로직 (150 lines)
     - `PayrollPreviewTable.tsx` - 미리보기 (300 lines)
     - `PayrollUploadActions.tsx` - 액션 버튼 (100 lines)
     - `usePayrollUpload.ts` - 상태 관리 (150 lines)

5. **PayslipBulkUpload.tsx** (886 lines) ✅
   - [x] 완료된 분할:
     - `PayslipFileProcessor.ts` - 파일 처리 (200 lines)
     - `PayslipPreview.tsx` - 미리보기 (250 lines)
     - `PayslipDistribution.tsx` - 배포 UI (200 lines)
     - `usePayslipUpload.ts` - 상태 관리 (150 lines)

### Phase 4: 중간 우선순위 ✅ 완료
6. **LeaveManagement.tsx** (838 lines) ✅
   - [x] 완료된 분할:
     - `LeaveRequestForm.tsx` - 휴가 신청 폼 (200 lines)
     - `LeaveHistory.tsx` - 휴가 이력 (200 lines)
     - `LeaveBalance.tsx` - 휴가 잔액 (150 lines)
     - `LeaveApproval.tsx` - 승인 워크플로우 (200 lines)

7. **api.ts 서비스 레이어 분할** (726 lines) ✅
   - [x] 도메인별 분할 완료:
     - `api/auth.ts` - 인증 API (100 lines)
     - `api/users.ts` - 사용자 관리 (100 lines)
     - `api/leave.ts` - 휴가 관리 (150 lines)
     - `api/payroll.ts` - 급여 관리 (150 lines)
     - `api/departments.ts` - 부서 관리 (80 lines)
     - `api/documents.ts` - 문서 관리 (80 lines)
     - `api/base.ts` - 기본 설정 (66 lines)

## 리팩토링 실행 계획

### 주간 실행 계획
**Week 1 (현재)**
- Day 1: UnifiedLeaveOverview.backup.tsx 삭제
- Day 2-3: PayrollGrid.tsx 리팩토링 시작
- Day 4-5: PayrollGrid.tsx 완료 및 테스트

**Week 2**
- Excel 내보내기 기능 구현 완료 대기
- UnifiedLeaveOverview.tsx 리팩토링 계획 수립

**Week 3**
- PayrollExcelUploadWithPreview.tsx 리팩토링
- PayslipBulkUpload.tsx 리팩토링

## 예상 결과

### 리팩토링 전
- 10개 파일 700줄 이상
- 1개 파일 1000줄 초과
- 평균 파일 크기: 약 800줄

### 리팩토링 후 목표
- 모든 파일 600줄 이하
- 평균 파일 크기: 200-300줄
- 총 파일 수: 약 40-50개 (작은 모듈로 분할)

## 성공 기준
1. 단일 파일 600줄 이하 유지
2. 각 파일 단일 책임 원칙 준수
3. 테스트 가능성 향상
4. 기능 손실 없음
5. 모든 TypeScript 컴파일 오류 해결
6. 기존 테스트 모두 통과

## 리스크 및 대응 방안

### 리스크
1. **Excel 기능과의 충돌**: UnifiedLeaveOverview 리팩토링 시 Excel 기능 영향
   - 대응: Excel 기능 구현 완료 후 리팩토링 진행

2. **대규모 파일 변경**: 많은 import 경로 변경 필요
   - 대응: 단계적 리팩토링, 각 단계별 테스트

3. **기능 손실 위험**: 리팩토링 중 기능 누락 가능성
   - 대응: 상세한 테스트 체크리스트 작성

## 관련 문서
- `payroll-grid-refactoring-plan.md` - PayrollGrid 상세 계획
- `todo-development.md` - 현재 진행 중인 작업
- `00-REFACTORING-INDEX.md` - 전체 리팩토링 인덱스
- `FUNCTIONS_VARIABLES.md` - 함수 재사용 가이드