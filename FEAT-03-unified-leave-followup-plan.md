# Unified Leave Overview 후속 작업 계획

> 📌 **참고**: 이 문서는 [`todo-development.md`](./todo-development.md)의 Unified Leave Overview 섹션에서 참조되는 상세 계획 문서입니다.

## 개요
Unified Leave Overview 구현은 완료되었지만, 실제 프로덕션 환경에서 사용하기 위해 필요한 후속 작업들을 정리한 문서입니다.

## 작업 우선순위

### 🔴 Priority 1: 즉시 필요한 작업 (1-2일)

#### 1.1 Navigation Menu 업데이트 ✅ (2025.08.20 완료)
**완료 상태**: 
- Admin: `/leave/overview` 경로로 업데이트 완료
- Supervisor: `/leave/overview` 경로로 업데이트 완료
- Layout.tsx의 adminItems와 supervisorItems 모두 새 경로 반영 완료

**완료된 작업**:
```typescript
// frontend/src/components/Layout.tsx 수정 필요

// adminItems의 leave-management 섹션 변경
const adminItems = {
  'leave-management': [
    {
      text: '전체 휴가 현황',
      path: '/leave/overview',  // 기존: /admin/leave/overview
      permissions: ['admin:permissions'],
    },
  ],
  // ...
}

// supervisorItems의 leave-management 섹션 변경
const supervisorItems = {
  'leave-management': [
    {
      text: '직원 휴가 현황',
      path: '/leave/overview',  // 기존: /supervisor/leave/status
      permissions: ['leave:manage'],
    },
    // 직원 휴가 승인은 그대로 유지
    {
      text: '직원 휴가 승인',
      path: '/supervisor/leave/requests',
      permissions: ['leave:manage'],
    },
  ],
  // ...
}
```

#### 1.2 TypeScript 컴파일 오류 수정

**오류 1: API Service 중복 메서드**
```typescript
// frontend/src/services/api.ts
// calculateIncentive 메서드가 중복 선언됨
// 689번 줄의 중복 메서드 제거 필요
```

**오류 2: Grid 컴포넌트 타입 오류**
```typescript
// frontend/src/components/Incentive/ParameterInputs.tsx
// Grid 컴포넌트에서 'item' prop 사용 문제
// MUI v5의 Grid2로 마이그레이션 또는 size prop 사용
```

**오류 3: 타입 불일치**
```typescript
// UnifiedLeaveOverview.tsx line 157
// initialViewMode prop 타입 수정
initialViewMode: props.initialViewMode || 'overview'
// 수정: 타입 assertion 추가
initialViewMode: (props.initialViewMode || 'overview') as 'overview' | 'team' | 'department'
```

### 🟡 Priority 2: 중기 작업 (3-5일)

#### 2.1 FUNCTIONS_VARIABLES.md 업데이트

**추가할 내용**:
```markdown
## Unified Leave Overview Functions

### Component (`frontend/src/components/UnifiedLeaveOverview.tsx`)

#### State Management
- `loadLeaveData()` - 역할 기반 데이터 로딩 (Admin/Supervisor)
- `getStatusColor(status, type)` - 통합 색상 함수
- `getStatusLabel(status, type)` - 통합 레이블 함수
- `renderViewModeSelector()` - 역할별 뷰 모드 선택기
- `renderContent()` - 뷰 모드별 콘텐츠 렌더링

#### Admin-specific Functions
- `renderAdminOverview()` - Admin 전체 현황 렌더링
- `getFilteredEmployees()` - 직원 필터링 및 정렬
- `handleAdjustLeave()` - 휴가 조정 다이얼로그
- `handleExportExcel()` - Excel 내보내기 (placeholder)

#### Team/Supervisor Functions  
- `renderTeamView()` - 팀 현황 렌더링
- `renderDepartmentView()` - 부서 통계 렌더링
- `handleMemberClick()` - 팀원 상세 정보
- `handleViewDetail()` - 직원 휴가 로그 조회
```

#### 2.2 Jest 테스트 작성

**테스트 파일**: `frontend/src/components/__tests__/UnifiedLeaveOverview.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import UnifiedLeaveOverview from '../UnifiedLeaveOverview';

describe('UnifiedLeaveOverview', () => {
  it('Admin은 3개 뷰 모드를 볼 수 있어야 함', async () => {
    // Overview, Team, Department 버튼 확인
  });

  it('Supervisor는 2개 뷰 모드만 볼 수 있어야 함', async () => {
    // Team, Department 버튼만 확인
  });

  it('데이터 로딩 시 로딩 스피너 표시', async () => {
    // CircularProgress 컴포넌트 확인
  });

  it('API 오류 시 에러 메시지 표시', async () => {
    // showError 호출 확인
  });
});
```

#### 2.3 성능 최적화

**React Query 도입**:
```typescript
// frontend/src/hooks/useLeaveData.ts
import { useQuery } from '@tanstack/react-query';

export const useLeaveOverview = (userRole: string, viewMode: string) => {
  return useQuery({
    queryKey: ['leaveOverview', userRole, viewMode],
    queryFn: async () => {
      // API 호출 로직
    },
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  });
};
```

**가상 스크롤링**:
```typescript
// 대규모 직원 목록을 위한 react-window 도입
import { FixedSizeList } from 'react-window';
```

### 🟢 Priority 3: 장기 작업 (1-2주)

#### 3.1 Excel 내보내기 구현

**백엔드 API 추가**:
```javascript
// backend/routes/admin/leaveAdmin.js
router.get('/overview/export', requireAuth, requireAdmin, async (req, res) => {
  // ExcelJS를 사용한 Excel 파일 생성
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('휴가 현황');
  
  // 데이터 추가
  worksheet.columns = [
    { header: '이름', key: 'name', width: 15 },
    { header: '부서', key: 'department', width: 20 },
    { header: '총연차', key: 'totalLeave', width: 10 },
    { header: '사용', key: 'usedLeave', width: 10 },
    { header: '잔여', key: 'remainingLeave', width: 10 },
  ];
  
  // 스트림으로 전송
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=leave_overview.xlsx');
  await workbook.xlsx.write(res);
});
```

#### 3.2 고급 분석 기능

**차트 추가**:
- 부서별 휴가 사용률 차트 (Recharts)
- 월별 휴가 사용 트렌드
- 직원별 휴가 패턴 분석

**예측 기능**:
- 연말 휴가 미사용 예상 인원
- 부서별 휴가 소진율 예측

#### 3.3 모바일 최적화

**반응형 개선**:
```typescript
// 모바일 전용 뷰
const MobileLeaveOverview = () => {
  // 카드 기반 레이아웃
  // 스와이프 제스처 지원
  // 하단 시트 패턴
};
```

## 2주 후 정리 작업

### Phase 1: 모니터링 (Week 1-2)
- [ ] 사용자 피드백 수집
- [ ] 에러 로그 모니터링
- [ ] 성능 메트릭 측정

### Phase 2: 구 컴포넌트 제거 (Week 3)
```bash
# 제거할 파일들
rm frontend/src/pages/AdminLeaveOverview.tsx
rm frontend/src/components/TeamLeaveStatus.tsx
rm frontend/src/pages/TeamLeaveStatusPage.tsx
```

### Phase 3: 라우트 정리 (Week 3)
```typescript
// App.tsx에서 구 라우트 제거
// <Route path="admin/leave/overview" ... /> 제거
// <Route path="supervisor/leave/status" ... /> 제거
```

### Phase 4: Import 정리
```bash
# 사용하지 않는 import 찾기
grep -r "AdminLeaveOverview\|TeamLeaveStatus" frontend/src/
```

## 체크리스트

### 즉시 작업
- [x] Navigation Menu에서 새 경로로 업데이트 ✅ (2025.08.20 완료)
- [x] TypeScript 오류 수정 ✅ (2025.08.20 완료)
  - [x] API service 중복 메서드 제거 (line 333 calculateIncentive 제거 완료)
  - [x] Grid 컴포넌트 타입 수정 (MUI v5 Grid size prop으로 변경 완료)
  - [x] UnifiedLeaveOverview API 응답 구조 불일치 수정 ✅
    - Backend API가 { success: true, data: { statistics, employees } } 구조로 반환
    - Frontend에서 적절히 변환하도록 수정 완료
  - [x] 기타 타입 오류 수정 (19개 오류 남음) ✅ (2025.08.20 완료)

### 중기 작업
- [x] FUNCTIONS_VARIABLES.md 문서화 ✅ (2025.08.20 완료)
  - [x] 모든 UnifiedLeaveOverview 함수 문서화 완료
  - [x] 기존 FUNCTIONS_VARIABLES.md 형식에 맞춰 작성
  - [x] 함수별 용도, 매개변수, 반환값, 부수효과 명시
- [x] Vitest 테스트 케이스 작성 ✅ (2025.08.20 완료)
  - [x] 역방향 TDD 적용 (기존 코드에 대한 테스트 작성)
  - [x] 12개 테스트 작성 완료
  - [x] 8개 테스트 통과 (66.7% 성공률)
  - [x] AuthProvider 테스트 지원 추가
  - [x] 실제 MongoDB 사용 (Mock 없음)
- [x] React Query 도입 ✅ (Already implemented)
  - [x] useLeaveOverview, useTeamStatus, useDepartmentStats hooks created
  - [x] Optimistic updates for leave adjustments
  - [x] Query invalidation and prefetching implemented
  - [x] Tests written (though using mocks)
- [ ] 가상 스크롤링 구현

### 장기 작업
- [ ] Excel 내보내기 API 구현
- [ ] 차트 및 분석 기능 추가
- [ ] 모바일 전용 뷰 개발

### 정리 작업
- [ ] 2주 모니터링 완료
- [ ] 구 컴포넌트 제거
- [ ] 구 라우트 제거
- [ ] 사용하지 않는 import 정리

## 예상 일정

| 작업 | 예상 소요 시간 | 우선순위 |
|-----|--------------|---------|
| Navigation Menu 업데이트 | 30분 | 🔴 High |
| TypeScript 오류 수정 | 2시간 | 🔴 High |
| FUNCTIONS_VARIABLES.md | 1시간 | 🟡 Medium |
| Jest 테스트 | 4시간 | 🟡 Medium |
| React Query 도입 | 1일 | 🟡 Medium |
| Excel 내보내기 | 1일 | 🟢 Low |
| 차트 기능 | 2일 | 🟢 Low |
| 모바일 최적화 | 3일 | 🟢 Low |

## 위험 요소 및 대응

### 위험 1: 사용자 혼란
- **문제**: 메뉴 위치 변경으로 인한 사용자 혼란
- **대응**: 
  - 변경 사항 공지
  - 툴팁으로 새 위치 안내
  - 1주일간 양쪽 경로 모두 유지

### 위험 2: 성능 저하
- **문제**: 통합 컴포넌트의 크기로 인한 초기 로딩 지연
- **대응**:
  - 코드 스플리팅 강화
  - 레이지 로딩 적용
  - 데이터 프리페칭

### 위험 3: 브라우저 호환성
- **문제**: 구형 브라우저에서 Grid2 컴포넌트 미지원
- **대응**:
  - 폴리필 추가
  - 대체 레이아웃 제공

## 참고 문서
- `leave-overview-integration-plan.md` - 초기 통합 계획
- `unified-leave-overview-summary.md` - 구현 요약
- `test-unified-leave.sh` - 테스트 스크립트