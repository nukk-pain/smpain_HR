# 컴포넌트 경량화 계획

## 현재 상황 분석

### UserManagement.tsx 문제점
- **현재 라인 수**: 1,131줄
- **주요 문제**: 단일 책임 원칙 위반으로 너무 많은 기능이 하나의 컴포넌트에 집중
- **복잡성**: 63개 함수/hooks/상태, 221개 UI 컴포넌트 사용, 5개 이상의 Dialog

### 기능 분석
현재 UserManagement.tsx가 담당하는 기능들:
1. 사용자 목록 조회 및 필터링
2. 사용자 생성/수정 Form
3. 사용자 상세정보 조회
4. 권한 관리
5. 비밀번호 리셋
6. 사용자 삭제 (일반/영구)
7. 대량 작업
8. 검색 및 정렬

## 리팩토링 계획

### Phase 1: 컴포넌트 분리 (구조적 변경)

#### 1.1 주요 컴포넌트 분할
```
UserManagement.tsx (메인 컨테이너) → 약 300-400줄
├── UserList.tsx (사용자 목록 및 AG Grid) → 약 200-250줄
├── UserForm.tsx (생성/수정 폼) → 약 200-250줄
├── UserDetailDialog.tsx (상세정보) → 약 100-150줄
├── UserPermissionsDialog.tsx (권한 관리) → 약 150-200줄
├── UserFilters.tsx (검색/필터) → 약 100-150줄
└── UserActions.tsx (액션 버튼들) → 약 100줄
```

#### 1.2 커스텀 훅 분리
```
hooks/
├── useUserManagement.ts → 사용자 CRUD 로직
├── useUserPermissions.ts → 권한 관리 로직
├── useUserFilters.ts → 필터링/검색 로직
└── useUserForm.ts → 폼 검증 및 상태 관리
```

#### 1.3 유틸리티 및 상수 분리
```
constants/
├── userRoles.ts → 역할 정의
├── incentiveFormulas.ts → 인센티브 공식
└── userValidation.ts → 검증 규칙

utils/
├── userHelpers.ts → 사용자 관련 헬퍼 함수
└── permissionUtils.ts → 권한 관련 유틸
```

### Phase 2: 훅 및 로직 분리 (동작적 변경)

#### 2.1 useUserManagement 훅
```typescript
// hooks/useUserManagement.ts
export const useUserManagement = () => {
  // 사용자 CRUD 로직
  // API 호출 및 상태 관리
  // 에러 처리
  return {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers
  }
}
```

#### 2.2 useUserForm 훅
```typescript
// hooks/useUserForm.ts
export const useUserForm = (initialUser?: User) => {
  // 폼 상태 관리
  // 검증 로직
  // 제출 처리
  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
    resetForm
  }
}
```

### Phase 3: UI 컴포넌트 최적화 (표현적 변경)

#### 3.1 컴포넌트 구조
```
components/UserManagement/
├── index.ts → 메인 export
├── UserManagement.tsx → 컨테이너 컴포넌트
├── UserList/
│   ├── UserList.tsx
│   ├── UserListGrid.tsx
│   └── UserListActions.tsx
├── UserForm/
│   ├── UserForm.tsx
│   ├── UserFormFields.tsx
│   └── UserFormValidation.ts
├── UserDialogs/
│   ├── UserDetailDialog.tsx
│   ├── UserPermissionsDialog.tsx
│   └── UserDeleteConfirmDialog.tsx
└── UserFilters/
    ├── UserFilters.tsx
    └── UserFilterControls.tsx
```

## 구현 단계별 계획

### 단계 1: 기반 작업 (1-2일)
- [ ] 상수 및 타입 분리
- [ ] 유틸리티 함수 분리
- [ ] 기본 훅 구조 생성

### 단계 2: 핵심 컴포넌트 분리 (2-3일)
- [ ] UserForm 컴포넌트 분리
- [ ] UserList 컴포넌트 분리
- [ ] 기본 동작 테스트

### 단계 3: 다이얼로그 분리 (1-2일)
- [ ] 상세정보 다이얼로그 분리
- [ ] 권한 관리 다이얼로그 분리
- [ ] 삭제 확인 다이얼로그 분리

### 단계 4: 필터 및 검색 분리 (1일)
- [ ] UserFilters 컴포넌트 분리
- [ ] 검색 로직 훅 분리

### 단계 5: 최적화 및 테스트 (1-2일)
- [ ] 성능 최적화 (React.memo, useMemo 적용)
- [ ] 전체 기능 테스트
- [ ] 에러 처리 개선

## 예상 결과

### 라인 수 감소
- **현재**: 1,131줄 (단일 파일)
- **목표**: 200-400줄 (컴포넌트별 분리)

### 유지보수성 향상
- 단일 책임 원칙 준수
- 재사용 가능한 컴포넌트
- 테스트 용이성 증대

### 성능 개선
- 컴포넌트별 개별 렌더링
- 불필요한 리렌더링 방지
- 코드 스플리팅 가능

## 위험 요소 및 대응책

### 위험 요소
1. **기존 기능 손실**: 복잡한 상태 관리로 인한 기능 누락 가능성
2. **성능 저하**: 과도한 컴포넌트 분리로 인한 props drilling
3. **개발 시간**: 대규모 리팩토링으로 인한 일정 지연

### 대응책
1. **점진적 리팩토링**: 단계별로 진행하며 각 단계마다 테스트
2. **Context API 활용**: props drilling 방지를 위한 적절한 Context 사용
3. **기능 동결**: 리팩토링 기간 중 새 기능 추가 금지

## 성공 지표

### 정량적 지표
- [ ] 각 컴포넌트 500줄 이하로 유지
- [ ] 테스트 커버리지 80% 이상
- [ ] 빌드 시간 단축

### 정성적 지표
- [ ] 코드 가독성 향상
- [ ] 새 기능 추가 용이성
- [ ] 버그 발생률 감소

## 참고사항

- **TDD 원칙 준수**: 각 컴포넌트 분리 시 테스트 먼저 작성
- **Tidy First 적용**: 구조적 변경과 동작적 변경 분리
- **문서화**: 각 컴포넌트별 사용법 문서 작성
- **성능 모니터링**: 리팩토링 전후 성능 비교

---

**작성일**: 2025-08-04  
**작성자**: Claude Code  
**검토 필요**: Phase 1 완료 후 검토 예정