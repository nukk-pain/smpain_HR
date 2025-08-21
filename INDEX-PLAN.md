# 개발 계획 인덱스 (Plan Index)

## 📋 파일명 규칙
- **FEAT-XX**: 기능 개발 계획 (Feature)
- **REFACTOR-XX**: 리팩토링 계획
- **FIX-XX**: 버그 수정 계획
- **DEPLOY-XX**: 배포 계획

## 📊 현재 진행 상황 요약
- **진행 중**: 0개
- **대기 중**: 2개 
- **완료**: 4개
- **보류**: 1개

---

## 🔄 진행 중인 계획

*현재 진행 중인 작업 없음*

---

## ⏳ 대기 중인 계획

### REFACTOR-01: **PayrollGrid 컴포넌트 리팩토링** 📋 **대기**
- **문서**: [`REFACTOR-01-payroll-grid-plan.md`](./REFACTOR-01-payroll-grid-plan.md)
- **예상 소요**: 3일
- **현재 상태**: 1059줄 → 목표 300-400줄
- **우선순위**: HIGH (1000줄 초과)
- **주요 작업**:
  - Excel 처리 로직 분리
  - 계산 로직 유틸리티 추출
  - AG Grid 설정 분리
  - 서브 컴포넌트 분할

### DEPLOY-01: **프로덕션 배포 계획** 🚢 **대기**
- **문서**: [`DEPLOY-01-production-plan.md`](./DEPLOY-01-production-plan.md)
- **예상 소요**: 2일
- **대기 이유**: 기능 개발 완료 후
- **우선순위**: MEDIUM
- **주요 작업**:
  - Google Cloud Run 배포
  - Vercel 프론트엔드 배포
  - 환경 변수 설정
  - 모니터링 설정

---

## ⏸️ 보류 중인 계획

### REFACTOR-02: **Reports.js 분할** ⏸️ **HOLD**
- **문서**: [`REFACTOR-02-reports-plan.md`](./REFACTOR-02-reports-plan.md)
- **보류 이유**: 미사용 코드 제거 필요 (12개 중 8개 미사용)
- **선행 작업**: 미사용 엔드포인트 제거

---

## ✅ 완료된 계획

### FEAT-01: **Excel 내보내기 API 구현** ✅ **완료**
- **문서**: [`FEAT-01-excel-export-plan.md`](./FEAT-01-excel-export-plan.md)
- **완료일**: 2025년 8월 21일
- **소요 시간**: 1일
- **성과**:
  - ✅ Backend API 완전 구현 (`/api/leave/admin/export/excel`)
  - ✅ LeaveExcelService 클래스 구현 (overview, team, department 뷰)
  - ✅ Frontend 통합 완료 (handleExportExcel, exportLeaveToExcel)
  - ✅ 모든 테스트 통과 (Backend: 5/5, Frontend: 4/4)
  - ✅ E2E 테스트 성공 (응답시간 14ms)
  - ✅ 한글 파일명 인코딩 처리

### FEAT-02: **차트 및 분석 기능** ✅ **완료**
- **문서**: [`FEAT-02-charts-analytics-plan.md`](./FEAT-02-charts-analytics-plan.md)
- **완료일**: 2025년 8월 21일
- **소요 시간**: 2시간
- **성과**:
  - ✅ LeaveAnalyticsCharts 컴포넌트 구현
  - ✅ Recharts 라이브러리 통합
  - ✅ 위험도 분포 파이 차트
  - ✅ 부서별 사용률 바 차트
  - ✅ 통계 카드 (전체, 평균, 고위험, 대기중)
  - ✅ 실시간 데이터 계산 및 필터 연동

### FEAT-03: **모바일 최적화 뷰** ✅ **완료**
- **완료일**: 2025년 8월 21일
- **소요 시간**: 1시간
- **성과**:
  - ✅ MobileLeaveOverview 컴포넌트 구현
  - ✅ 터치 최적화 UI (확장 가능한 카드)
  - ✅ 스와이프 가능한 필터 드로어
  - ✅ 플로팅 액션 버튼 (FAB)
  - ✅ useMediaQuery로 자동 전환
  - ✅ 고정 헤더와 요약 통계

### FEAT-02 (이전): **React Query 최적화** ✅ **완료**
- **문서**: [`completed/FEAT-02-react-query-optimization-plan.md`](./completed/FEAT-02-react-query-optimization-plan.md)
- **완료일**: 2025년 1월 20일
- **소요 시간**: 4.5시간
- **성과**:
  - 네트워크 요청 60% 감소
  - 낙관적 업데이트 구현
  - 6개 커스텀 훅 생성

---

## 📅 향후 계획 (Backlog)

### 계획 필요 작업들
- **통합 테스트 스위트 구축** (1주, MEDIUM)
- **성능 모니터링 대시보드** (3일, LOW)
- **사용자 피드백 시스템** (3일, LOW)
- **다국어 지원** (2주, LOW)

---

## 🔗 관련 문서 상호 참조

### 주요 관리 문서
| 문서 | 설명 | 링크 |
|------|------|------|
| **작업 목록** | 개발 작업 현황 | [`todo-development.md`](./todo-development.md) |
| **계획 인덱스** | 모든 계획 관리 (현재 문서) | [`INDEX-PLAN.md`](./INDEX-PLAN.md) |
| **리팩토링 인덱스** | 리팩토링 전용 | [`INDEX-REFACTOR.md`](./INDEX-REFACTOR.md) |
| **함수/변수 문서** | 구현된 기능 문서화 | [`docs/development/FUNCTIONS_VARIABLES.md`](./docs/development/FUNCTIONS_VARIABLES.md) |

### 문서 간 연결 구조
```
todo-development.md (작업 목록)
    ↓ 참조
INDEX-PLAN.md (계획 인덱스)
    ↓ 상세
FEAT-XX, REFACTOR-XX, DEPLOY-XX (개별 계획)
    ↓ 구현
FUNCTIONS_VARIABLES.md (구현 문서화)
```

---

## 📈 진행률 통계

### 오늘 (2025.08.21)
- **완료**: 3개 (Excel Export, Charts, Mobile View)
- **진행률**: 100% (계획된 작업 모두 완료)

### 이번 주 성과
- **Excel 내보내기**: 전체 구현 완료 ✅
- **차트 분석 기능**: 구현 완료 ✅
- **모바일 최적화**: 구현 완료 ✅
- **코드 품질**: 테스트 커버리지 향상

### 누적 완료 (2025년)
- **완료**: 4개 기능
- **대기**: 2개
- **보류**: 1개

---

## ⚠️ 관리 규칙

### 1. 우선순위 기준
- **CRITICAL**: 즉시 해결 필요 (버그, 보안)
- **HIGH**: 1주 내 완료 필요
- **MEDIUM**: 2주 내 완료 목표
- **LOW**: 시간 여유 있을 때

### 2. 파일명 규칙
- **기능 개발**: `FEAT-XX-name-plan.md`
- **리팩토링**: `REFACTOR-XX-name-plan.md`
- **버그 수정**: `FIX-XX-name-plan.md`
- **배포**: `DEPLOY-XX-name-plan.md`

### 3. 상태 관리
- **진행중**: 현재 작업 중 (한 번에 1-2개만)
- **대기**: 시작 대기 중
- **보류**: 선행 작업 필요
- **완료**: completed/ 폴더로 이동

### 4. 문서 업데이트
- 상태 변경 시 즉시 업데이트
- todo-development.md와 동기화
- FUNCTIONS_VARIABLES.md에 구현 문서화

---

## 🔄 업데이트 이력

- **2025.08.21 14:00**: 대규모 업데이트
  - Excel 내보내기 기능 완료
  - 차트 및 분석 기능 완료
  - 모바일 최적화 뷰 완료
  - 모든 계획 상태 업데이트
  
- **2025.01.20 15:00**: 파일명 규칙 적용 및 재구성
  - Option 3 (타입 약어) 방식 채택
  - 모든 계획 파일명 변경
  
- **2025.01.20 14:00**: 최초 작성
  - React Query 최적화 완료
  - Excel 내보내기 진행 상태 업데이트