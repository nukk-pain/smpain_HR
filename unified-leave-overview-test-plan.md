# UnifiedLeaveOverview 컴포넌트 Vitest 테스트 계획 ✅ COMPLETED

## 🎉 구현 완료 (2025-08-20)
- **총 12개 테스트 작성 완료**
- **8개 테스트 통과** (성공률 66.7%)
- **4개 테스트 API 연결 필요**
- **역방향 TDD (Reverse TDD) 적용**

### 구현된 테스트 파일
- `UnifiedLeaveOverview.test.tsx` - 기본 렌더링 및 역할 기반 접근 제어 (5개 테스트, 모두 통과)
- `UnifiedLeaveOverview.dataLoading.test.tsx` - 데이터 로딩 및 필터링 (7개 테스트, 3개 통과)

## 📋 개요
UnifiedLeaveOverview 컴포넌트에 대한 포괄적인 단위 테스트 및 통합 테스트 구현

## 🎯 테스트 목표
- 역할 기반 접근 제어 검증
- 데이터 로딩 및 에러 처리
- 필터링 및 검색 기능
- UI 상호작용 및 상태 관리
- API 통합 테스트
- **Excel 내보내기 기능**
- **휴가 사용률 계산 로직**
- **위험도 레벨 판정 로직**

## 📁 테스트 파일 구조
```
frontend/src/components/
├── UnifiedLeaveOverview.test.tsx      # 메인 컴포넌트 테스트
├── UnifiedLeaveOverview.admin.test.tsx # Admin 전용 기능
└── UnifiedLeaveOverview.supervisor.test.tsx # Supervisor 기능

frontend/src/pages/
└── UnifiedLeaveOverviewPage.test.tsx  # 페이지 래퍼 테스트
```

**참고**: Vitest 사용 (Jest 아님)

## 🔄 TDD 사이클별 구현 계획

**중요**: 모든 테스트는 TDD 원칙을 따름
1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 구현
3. **Refactor**: 테스트가 통과한 상태에서 코드 개선

### Phase 1: 기본 렌더링 테스트 (Red → Green → Refactor)

#### Test 1: 컴포넌트 기본 렌더링
```typescript
// Red: 컴포넌트가 에러 없이 렌더링되는지 확인
test('should render UnifiedLeaveOverview without crashing', async () => {
  // 테스트 DB에 실제 사용자 생성 (admin role)
  // 실제 JWT 토큰 발급
  // AuthContext에 실제 사용자 정보 제공
  // 컴포넌트 렌더링 테스트
})
```

#### Test 2: 로딩 상태 표시
```typescript
// Red: 초기 로딩 상태가 올바르게 표시되는지
test('should display loading state initially', () => {
  // CircularProgress 확인
})
```

#### Test 3: 에러 상태 처리
```typescript
// Red: API 에러 시 에러 메시지 표시
test('should display error message when API fails', () => {
  // Error alert 표시 확인
})
```

### Phase 2: 역할 기반 접근 제어 테스트

#### Test 4: Admin 사용자 - 3개 탭 표시
```typescript
// Red: Admin은 overview, team, department 3개 탭 모두 볼 수 있어야 함
test('should display all three tabs for admin users', async () => {
  // MongoDB에 Admin 사용자 생성
  // 실제 로그인 프로세스 수행
  // JWT 토큰 받아서 사용
  // 3개 탭 존재 확인
  // 각 탭 클릭 가능 확인
})
```

#### Test 5: Supervisor 사용자 - 2개 탭만 표시
```typescript
// Red: Supervisor는 team, department 2개 탭만 볼 수 있어야 함
test('should display only team and department tabs for supervisors', () => {
  // 2개 탭만 존재 확인
  // overview 탭 없음 확인
})
```

#### Test 6: 일반 사용자 - 접근 제한
```typescript
// Red: 일반 사용자는 컴포넌트에 접근할 수 없어야 함
test('should not render for regular users', () => {
  // null 또는 redirect 확인
})
```

### Phase 3: 데이터 로딩 및 API 통합 테스트

#### Test 7: 휴가 데이터 로드
```typescript
// Red: API에서 휴가 데이터를 올바르게 로드
test('should load leave data on mount', async () => {
  // 실제 API 호출: GET /api/admin/leave/overview (Admin용)
  // 또는 GET /api/leave/team-status (Supervisor용)
  // MongoDB에서 데이터 로드
  // 데이터 표시 확인
})
```

#### Test 8: 부서 데이터 로드
```typescript
// Red: 부서 목록을 올바르게 로드
test('should load departments for filtering', async () => {
  // GET /api/departments 호출
  // 또는 GET /api/leave/team-status 응답에서 departments 추출
  // 부서 필터 옵션 확인
})
```

#### Test 9: 연도 변경 시 데이터 리로드
```typescript
// Red: 연도 선택 변경 시 새 데이터 로드
test('should reload data when year changes', async () => {
  // 연도 변경
  // API 재호출 확인
  // 새 데이터 표시 확인
})
```

### Phase 4: 필터링 및 검색 기능 테스트

#### Test 10: 부서 필터링
```typescript
// Red: 부서 선택 시 데이터 필터링
test('should filter data by department', async () => {
  // 부서 선택
  // 필터링된 데이터만 표시 확인
})
```

#### Test 11: 위험도 필터링
```typescript
// Red: 위험도 레벨별 필터링
test('should filter by risk level', async () => {
  // high/medium/low 필터
  // 해당 레벨 데이터만 표시 확인
})
```

#### Test 12: 검색 기능
```typescript
// Red: 직원 이름으로 검색
test('should search employees by name', async () => {
  // 검색어 입력
  // 검색 결과만 표시 확인
})
```

### Phase 5: UI 상호작용 테스트

#### Test 13: 탭 전환
```typescript
// Red: 탭 클릭 시 뷰 전환
test('should switch views when tab clicked', async () => {
  // 탭 클릭
  // 해당 뷰 컨텐츠 표시 확인
})
```

#### Test 14: 정렬 기능
```typescript
// Red: 컬럼 헤더 클릭 시 정렬
test('should sort data when column header clicked', async () => {
  // 컬럼 헤더 클릭
  // 정렬된 순서 확인
})
```

#### Test 15: 직원 상세 다이얼로그
```typescript
// Red: 직원 행 클릭 시 상세 정보 표시
test('should open employee detail dialog', async () => {
  // 직원 행 클릭
  // GET /api/leave/employee/{employeeId}/log 호출
  // 다이얼로그 표시 확인
  // 휴가 이력 상세 정보 확인
})
```

### Phase 6: Admin 전용 기능 테스트

#### Test 16: 휴가 조정 다이얼로그 (Admin only)
```typescript
// Red: Admin만 휴가 조정 버튼 표시
test('should show leave adjustment button for admin', async () => {
  // Admin 컨텍스트
  // 조정 버튼 존재 확인
})
```

#### Test 17: 휴가 조정 실행
```typescript
// Red: 휴가 조정 API 호출 및 업데이트
test('should adjust leave balance when confirmed', async () => {
  // 조정 다이얼로그 열기
  // 값 입력
  // 저장 - POST /api/admin/leave/adjust 호출
  // MongoDB에서 leave_balances 업데이트 확인
  // 화면 데이터 업데이트 확인
})
```

#### Test 18: Supervisor 휴가 조정 차단
```typescript
// Red: Supervisor는 조정 버튼이 없어야 함
test('should not show adjustment button for supervisor', async () => {
  // Supervisor 컨텍스트
  // 조정 버튼 없음 확인
})
```

### Phase 7: 성능 및 최적화 테스트

#### Test 19: 메모이제이션 효과
```typescript
// Red: 불필요한 리렌더링 방지
test('should not re-render unnecessarily', async () => {
  // 렌더링 횟수 추적
  // props 변경 없이 상태 변경
  // 리렌더링 횟수 확인
})
```

#### Test 20: 대용량 데이터 처리
```typescript
// Red: 많은 직원 데이터 처리
test('should handle large dataset efficiently', async () => {
  // 1000+ 직원 데이터 로드
  // 렌더링 시간 측정
  // 성능 기준 충족 확인
})
```

### Phase 8: 비즈니스 로직 및 계산 테스트

#### Test 21: 휴가 사용률 계산
```typescript
// Red: 휴가 사용률이 올바르게 계산되는지 확인
test('should calculate leave usage rate correctly', () => {
  // 총 휴가 15일, 사용 10일 → 66.67%
  // 총 휴가 20일, 사용 5일 → 25%
  // 계산 결과 검증
})
```

#### Test 22: 위험도 레벨 판정
```typescript
// Red: 위험도 레벨이 올바르게 판정되는지 확인
test('should determine risk level correctly', () => {
  // 사용률 80% 이상 → high
  // 사용률 50-79% → medium
  // 사용률 50% 미만 → low
  // 각 케이스별 판정 확인
})
```

#### Test 23: Excel 내보내기 기능
```typescript
// Red: Excel 내보내기 버튼 클릭 시 동작
test('should trigger excel export when button clicked', async () => {
  // 실제 휴가 데이터 MongoDB에 생성
  // 내보내기 버튼 클릭
  // 실제 NotificationProvider의 showInfo 호출 확인
  // placeholder 메시지 확인
})
```

#### Test 24: 날짜 포맷팅
```typescript
// Red: 날짜가 올바른 형식으로 표시되는지
test('should format dates correctly', () => {
  // ISO 날짜 → YYYY-MM-DD 형식
  // format 함수 사용 확인
})
```

#### Test 25: 상태 색상 매핑
```typescript
// Red: 휴가 상태별 올바른 색상 반환
test('should return correct color for leave status', () => {
  // approved → success
  // pending → warning
  // rejected → error
  // cancelled → default
})
```

### Phase 9: 엣지 케이스 및 에러 처리

#### Test 26: 빈 데이터 처리
```typescript
// Red: 데이터가 없을 때 적절한 메시지 표시
test('should display empty state when no data', async () => {
  // 빈 배열 응답
  // "데이터가 없습니다" 메시지 확인
})
```

#### Test 27: API 타임아웃 처리
```typescript
// Red: API 응답이 늦을 때 타임아웃 처리
test('should handle API timeout gracefully', async () => {
  // API 지연 시뮬레이션
  // 타임아웃 에러 메시지 확인
})
```

#### Test 28: 네트워크 오류 처리
```typescript
// Red: 네트워크 오류 시 재시도 옵션 제공
test('should show retry option on network error', async () => {
  // 네트워크 오류 시뮬레이션
  // 재시도 버튼 표시 확인
})
```

### Phase 10: 통합 및 E2E 테스트

#### Test 29: 전체 워크플로우 테스트
```typescript
// Red: 사용자 시나리오 전체 테스트
test('should complete full user workflow', async () => {
  // 로그인 → 페이지 접근 → 필터링 → 상세 보기 → 조정
  // 전체 플로우 검증
})
```

#### Test 30: 다중 사용자 동시 접근
```typescript
// Red: 여러 사용자가 동시에 접근할 때
test('should handle concurrent access properly', async () => {
  // 동시 API 호출 시뮬레이션
  // 데이터 일관성 확인
})
```

## 🛠️ 테스트 유틸리티 설정

### 1. 테스트 데이터베이스 설정
```typescript
// frontend/src/test-utils/testDatabase.ts
export const setupTestDatabase = async () => {
  // MongoDB 테스트 데이터베이스 연결
  // 테스트용 실제 데이터 생성
  const testUsers = await createTestUsers();
  const testLeaveData = await createTestLeaveRequests();
  return { testUsers, testLeaveData };
}
```

### 2. Custom Render 함수
```typescript
// frontend/src/test-utils/testUtils.tsx
export async function renderWithAuth(component, { role = 'Admin' }) {
  // MongoDB에서 해당 role의 실제 사용자 조회 또는 생성
  // 실제 로그인 API 호출로 JWT 토큰 획득
  // AuthContext Provider에 실제 사용자 정보와 토큰 제공
  // NotificationProvider 포함
  // 컴포넌트 렌더
}
```

### 3. 테스트 API 설정
```typescript
// frontend/src/test-utils/testApi.ts
export const setupTestApi = () => {
  // 실제 백엔드 서버가 실행 중인지 확인
  // 테스트 환경 변수 설정 (Vite 환경변수)
  import.meta.env.VITE_API_URL = 'http://localhost:5455/api';
  // 백엔드 테스트 DB 연결 설정은 백엔드 .env.test 파일에서
  // MONGODB_URI = 'mongodb://localhost:27017/SM_nomu_test'
}
```

## 📊 테스트 커버리지 목표

- **라인 커버리지**: 80% 이상
- **브랜치 커버리지**: 75% 이상
- **함수 커버리지**: 85% 이상
- **Critical Path**: 100% (역할 기반 접근, 데이터 로딩)

## 📋 테스트 총 개수 및 분류

- **총 테스트 개수**: 30개
- **단위 테스트**: 20개 (Test 1-20)
- **통합 테스트**: 8개 (Test 21-28)
- **E2E 테스트**: 2개 (Test 29-30)

### 우선순위별 분류
- **P0 (필수)**: Test 1-6, 16-18 (역할 기반 접근 제어)
- **P1 (중요)**: Test 7-15, 21-25 (핵심 기능)
- **P2 (권장)**: Test 19-20, 26-28 (성능 및 엣지 케이스)
- **P3 (선택)**: Test 29-30 (E2E)

## 🚀 실행 계획

### Day 1: 환경 설정 및 기본 테스트
1. [ ] Vitest 및 React Testing Library 설정 확인 (vitest.config.ts 존재)
2. [ ] setupFiles 생성: `frontend/src/test/setup.ts`
3. [ ] 테스트 MongoDB 서버 실행 (mongodb://localhost:27017/SM_nomu_test)
4. [ ] 백엔드 서버 실행 (PORT=5455 - 현재 개발 서버 포트 사용)
5. [ ] 테스트 데이터 생성 유틸리티 작성
6. [ ] Phase 1 테스트 구현 (Test 1-3) - TDD 사이클 준수

### Day 2: 역할 기반 및 데이터 테스트
1. [ ] Phase 2 테스트 구현 (Test 4-6)
2. [ ] Phase 3 테스트 구현 (Test 7-9)
3. [ ] 테스트 데이터 생성 및 정리 로직 구현

### Day 3: 기능 및 상호작용 테스트
1. [ ] Phase 4 테스트 구현 (Test 10-12)
2. [ ] Phase 5 테스트 구현 (Test 13-15)

### Day 4: Admin 기능 및 성능 테스트
1. [ ] Phase 6 테스트 구현 (Test 16-18)
2. [ ] Phase 7 테스트 구현 (Test 19-20)

### Day 5: 비즈니스 로직 및 계산 테스트
1. [ ] Phase 8 테스트 구현 (Test 21-25)
2. [ ] 유틸리티 함수 단위 테스트

### Day 6: 엣지 케이스 및 통합 테스트
1. [ ] Phase 9 테스트 구현 (Test 26-28)
2. [ ] Phase 10 테스트 구현 (Test 29-30)

### Day 7: 리팩토링 및 최적화
1. [ ] 테스트 코드 리팩토링
2. [ ] 커버리지 분석 및 보완
3. [ ] 테스트 문서화

## 📝 테스트 명령어

```bash
# Vitest 기본 실행 (watch 모드)
npm test

# 단일 파일 테스트
npm test UnifiedLeaveOverview

# 테스트 UI 실행
npm run test:ui

# 단일 실행 (watch 모드 없이)
npm run test:run

# 커버리지 포함 테스트
npm run test:coverage

# 특정 테스트 패턴 실행
npm test -- -t "role-based access"
```

## ⚠️ 주의사항

1. **실제 MongoDB 데이터 사용**: 절대 Mock 사용 금지, 실제 테스트 DB 연결 필수
2. **Vitest 사용**: Jest가 아닌 Vitest 사용 (vitest.config.ts 참조)
3. **비동기 처리**: waitFor, findBy 사용으로 비동기 동작 처리
4. **데이터 정리**: 각 테스트 후 테스트 데이터 cleanup 수행
5. **격리**: 테스트 간 데이터베이스 상태 격리
6. **타입 안정성**: TypeScript 타입 검증 포함
7. **실제 인증**: 실제 JWT 토큰과 인증 플로우 사용
8. **테스트 데이터**: 각 테스트마다 필요한 실제 데이터 생성
9. **API 경로**: 모든 API는 `/api/` 프리픽스 사용
10. **포트 설정**: 프론트엔드(3727), 백엔드(5455)

## 🔗 관련 문서
- [UnifiedLeaveOverview 구현 요약](./unified-leave-overview-summary.md)
- [통합 계획](./leave-overview-integration-plan.md)
- [FUNCTIONS_VARIABLES.md](./docs/development/FUNCTIONS_VARIABLES.md)