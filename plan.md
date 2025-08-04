# UserManagement 컴포넌트 리팩토링 TDD 계획

## 리팩토링 목표
- UserManagement.tsx (1,131줄)를 여러 개의 작은 컴포넌트로 분리
- 각 컴포넌트는 500줄 이하 유지
- 단일 책임 원칙 준수
- 테스트 가능한 구조로 개선

## TDD 사이클 적용 방식
각 컴포넌트 분리 시 **Red → Green → Refactor** 사이클을 엄격히 준수

---

## Phase 1: 상수 및 유틸리티 분리

### Test 1: 사용자 역할 상수 분리
- [ ] **RED**: `constants/userRoles.ts`에 대한 테스트 작성 (실패)
- [ ] **GREEN**: 최소한의 userRoles 상수 구현 (테스트 통과)
- [ ] **REFACTOR**: 코드 정리 및 타입 안전성 개선

### Test 2: 인센티브 공식 상수 분리  
- [ ] **RED**: `constants/incentiveFormulas.ts`에 대한 테스트 작성 (실패)
- [ ] **GREEN**: 기본 인센티브 공식 구현 (테스트 통과)
- [ ] **REFACTOR**: 공식 계산 로직 최적화

### Test 3: 사용자 검증 유틸리티 분리
- [ ] **RED**: `utils/userValidation.ts`에 대한 테스트 작성 (실패)
- [ ] **GREEN**: username 검증 함수 구현 (테스트 통과)
- [ ] **REFACTOR**: 검증 규칙 확장 및 에러 메시지 개선

---

## Phase 2: 커스텀 훅 분리

### Test 4: useUserManagement 훅 생성
- [ ] **RED**: `hooks/useUserManagement.test.ts` 작성 - 사용자 목록 조회 테스트 (실패)
- [ ] **GREEN**: 기본 useUserManagement 훅 구현 (테스트 통과)
- [ ] **REFACTOR**: 에러 처리 및 로딩 상태 개선

### Test 5: useUserForm 훅 생성
- [ ] **RED**: `hooks/useUserForm.test.ts` 작성 - 폼 상태 관리 테스트 (실패)
- [ ] **GREEN**: 기본 폼 상태 관리 로직 구현 (테스트 통과)
- [ ] **REFACTOR**: 검증 로직 통합 및 최적화

### Test 6: useUserFilters 훅 생성
- [ ] **RED**: `hooks/useUserFilters.test.ts` 작성 - 필터링 로직 테스트 (실패)
- [ ] **GREEN**: 기본 필터링 기능 구현 (테스트 통과)
- [ ] **REFACTOR**: 검색 성능 최적화

### Test 7: useUserPermissions 훅 생성
- [ ] **RED**: `hooks/useUserPermissions.test.ts` 작성 - 권한 관리 테스트 (실패)
- [ ] **GREEN**: 권한 조회/수정 기능 구현 (테스트 통과)
- [ ] **REFACTOR**: 권한 검증 로직 강화

---

## Phase 3: 컴포넌트 분리

### Test 8: UserFilters 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserFilters.test.tsx` 작성 (실패)
  - 검색어 입력 테스트
  - 부서 필터 테스트
  - 상태 필터 테스트
- [ ] **GREEN**: UserFilters 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: UI 컴포넌트 최적화 및 접근성 개선

### Test 9: UserForm 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserForm.test.tsx` 작성 (실패)
  - 사용자 생성 폼 테스트
  - 사용자 수정 폼 테스트
  - 폼 검증 테스트
- [ ] **GREEN**: UserForm 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: 폼 레이아웃 최적화 및 UX 개선

### Test 10: UserList 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserList.test.tsx` 작성 (실패)
  - AG Grid 렌더링 테스트
  - 사용자 목록 표시 테스트
  - 정렬/필터링 테스트
- [ ] **GREEN**: UserList 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: 그리드 성능 최적화

### Test 11: UserDetailDialog 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserDetailDialog.test.tsx` 작성 (실패)
  - 다이얼로그 열기/닫기 테스트
  - 사용자 정보 표시 테스트
- [ ] **GREEN**: UserDetailDialog 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: 다이얼로그 레이아웃 최적화

### Test 12: UserPermissionsDialog 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserPermissionsDialog.test.tsx` 작성 (실패)
  - 권한 목록 표시 테스트
  - 권한 수정 테스트
  - 권한 저장 테스트
- [ ] **GREEN**: UserPermissionsDialog 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: 권한 UI 개선 및 사용성 향상

### Test 13: UserActions 컴포넌트 분리
- [ ] **RED**: `components/UserManagement/UserActions.test.tsx` 작성 (실패)
  - 액션 버튼 렌더링 테스트
  - 버튼 클릭 이벤트 테스트
- [ ] **GREEN**: UserActions 컴포넌트 구현 (테스트 통과)
- [ ] **REFACTOR**: 액션 버튼 그룹화 및 최적화

---

## Phase 4: 메인 컨테이너 리팩토링

### Test 14: 새로운 UserManagement 컨테이너 구성
- [ ] **RED**: 리팩토링된 UserManagement 통합 테스트 작성 (실패)
  - 전체 사용자 관리 플로우 테스트
  - 컴포넌트 간 상호작용 테스트
- [ ] **GREEN**: 분리된 컴포넌트들을 조합한 메인 컨테이너 구현 (테스트 통과)
- [ ] **REFACTOR**: 컴포넌트 조합 최적화 및 성능 개선

### Test 15: 기존 기능 회귀 테스트
- [ ] **RED**: 기존 UserManagement 모든 기능에 대한 E2E 테스트 작성 (실패)
  - 사용자 CRUD 전체 플로우
  - 권한 관리 플로우
  - 필터링 및 검색 플로우
- [ ] **GREEN**: 모든 기존 기능이 정상 작동하도록 구현 (테스트 통과)
- [ ] **REFACTOR**: 성능 최적화 및 사용자 경험 개선

---

## Phase 5: 성능 최적화

### Test 16: 컴포넌트 메모이제이션 적용
- [ ] **RED**: 렌더링 성능 테스트 작성 (실패)
  - 불필요한 리렌더링 검출 테스트
- [ ] **GREEN**: React.memo, useMemo, useCallback 적용 (테스트 통과)
- [ ] **REFACTOR**: 메모이제이션 최적화

### Test 17: 코드 스플리팅 적용
- [ ] **RED**: 번들 크기 테스트 작성 (실패)
- [ ] **GREEN**: 동적 import를 통한 코드 스플리팅 구현 (테스트 통과)
- [ ] **REFACTOR**: 로딩 상태 및 에러 처리 개선

---

## 테스트 실행 규칙

### 각 테스트 단계에서
1. **테스트 먼저 작성**: 실패하는 테스트부터 시작
2. **최소 구현**: 테스트를 통과하는 최소한의 코드만 작성
3. **리팩토링**: 테스트가 통과한 후에만 코드 개선
4. **전체 테스트 실행**: 각 단계 완료 후 전체 테스트 스위트 실행

### 테스트 도구
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Jest + React Testing Library
- **E2E Tests**: 수동 테스트 (TEST_GUIDE.md 기반)

### 성공 기준
- [ ] 모든 단위 테스트 통과
- [ ] 테스트 커버리지 80% 이상
- [ ] 기존 기능 100% 유지
- [ ] 각 컴포넌트 500줄 이하
- [ ] 빌드 에러 0개
- [ ] TypeScript 에러 0개

---

## 주의사항

### TDD 원칙 준수
- **절대 테스트 없이 코드 작성 금지**
- 각 컴포넌트 분리 시 반드시 테스트 먼저 작성
- Red-Green-Refactor 사이클 엄격히 준수

### 기능 보존
- 기존 기능 변경 금지
- 사용자 인터페이스 동일하게 유지
- API 호출 로직 변경 최소화

### 성능 고려
- 컴포넌트 분리로 인한 성능 저하 방지
- 적절한 메모이제이션 적용
- 불필요한 리렌더링 최소화

---

**작업 시작 조건**: 이 계획서 검토 완료 후  
**완료 예상**: 17개 테스트 단계 모두 완료 시  
**검토 포인트**: Phase별 완료 시 전체 기능 테스트 필수