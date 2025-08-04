# TDD Plan: HR System URL 구조 개선

## 목표
URL 경로를 통해 각 페이지의 역할과 접근 권한을 명확히 구분하고, 일관된 URL 구조로 직관적인 탐색을 제공한다.

## 선택한 URL 구조
기능별 그룹화 + 역할 구분 방식을 채택:
```
# 공용 페이지
/dashboard
/profile

# Leave 관련
/leave                    - 개인 휴가 관리 (모든 사용자)
/leave/calendar          - 휴가 캘린더 (모든 사용자)
/supervisor/leave/status    - 직원 휴가 현황 (Supervisor+)
/supervisor/leave/requests  - 휴가 승인 관리 (Supervisor+)
/admin/leave/overview    - 전체 휴가 현황 (Admin)
/admin/leave/policy      - 휴가 정책 관리 (Admin)

# HR 관리
/supervisor/users           - 사용자 관리 (Supervisor+)
/supervisor/departments     - 부서 관리 (Supervisor+)
/admin/users            - 전체 사용자 관리 (Admin)
/admin/departments      - 전체 부서 관리 (Admin)

# Payroll
/supervisor/payroll        - 직원 급여 관리 (Supervisor+)
/admin/payroll         - 전체 급여 관리 (Admin)

# Reports & Files
/supervisor/reports       - 직원 보고서 (Supervisor+)
/supervisor/files        - 직원 파일 관리 (Supervisor+)
/admin/reports        - 전체 보고서 (Admin)
/admin/files         - 전체 파일 관리 (Admin)
```

## TDD Test Plan

### Phase 1: Route Configuration Tests

#### [✅] Test 1: 공용 페이지 라우트 설정
**Test**: App.tsx에서 /dashboard, /profile 경로가 모든 인증된 사용자에게 접근 가능한지 테스트
**Expected**: 모든 역할(User, Supervisor, Admin)이 접근 가능

#### [✅] Test 2: User 역할 Leave 페이지 라우트 설정
**Test**: /leave, /leave/calendar 경로가 모든 사용자에게 접근 가능한지 테스트
**Expected**: 모든 역할이 접근 가능

#### [✅] Test 3: Supervisor Leave 페이지 라우트 설정
**Test**: /supervisor/leave/status, /supervisor/leave/requests 경로가 Supervisor+ 권한으로 접근 제한되는지 테스트
**Expected**: User 역할은 접근 불가, Supervisor와 Admin은 접근 가능

#### [✅] Test 4: Admin Leave 페이지 라우트 설정
**Test**: /admin/leave/overview, /admin/leave/policy 경로가 Admin 전용인지 테스트
**Expected**: User와 Supervisor는 접근 불가, Admin만 접근 가능

#### [✅] Test 5: Supervisor HR 관리 페이지 라우트 설정
**Test**: /supervisor/users, /supervisor/departments 경로가 Supervisor+ 권한으로 접근 제한되는지 테스트
**Expected**: User 역할은 접근 불가, Supervisor와 Admin은 접근 가능

#### [✅] Test 6: Admin HR 관리 페이지 라우트 설정
**Test**: /admin/users, /admin/departments 경로가 Admin 전용인지 테스트
**Expected**: User와 Supervisor는 접근 불가, Admin만 접근 가능

#### [✅] Test 7: Payroll 페이지 라우트 설정
**Test**: /supervisor/payroll, /admin/payroll 경로가 각각 올바른 권한으로 접근 제한되는지 테스트
**Expected**: /supervisor/payroll은 Supervisor+, /admin/payroll은 Admin만 접근 가능

#### [✅] Test 8: Reports & Files 페이지 라우트 설정
**Test**: /supervisor/reports, /supervisor/files, /admin/reports, /admin/files 경로가 각각 올바른 권한으로 접근 제한되는지 테스트
**Expected**: supervisor/* 경로는 Supervisor+, admin/* 경로는 Admin만 접근 가능

### Phase 2: 기존 URL 리다이렉트 Tests

#### [✅] Test 9: 기존 Leave 페이지 리다이렉트
**Test**: 기존 /leave-calendar 경로가 /leave/calendar로 리다이렉트되는지 테스트
**Expected**: 자동 리다이렉트 발생

#### [✅] Test 10: 기존 Employee Leave Status 페이지 리다이렉트
**Test**: 기존 /employee-leave-status 경로가 /supervisor/leave/status로 리다이렉트되는지 테스트
**Expected**: 자동 리다이렉트 발생

#### [✅] Test 11: 기존 Employee Leave 페이지 리다이렉트
**Test**: 기존 /employee-leave 경로가 /supervisor/leave/requests로 리다이렉트되는지 테스트
**Expected**: 자동 리다이렉트 발생

#### [✅] Test 12: 기존 Admin 페이지 리다이렉트
**Test**: 기존 /admin/leave-overview, /admin/leave-policy 경로가 새 구조로 올바르게 리다이렉트되는지 테스트
**Expected**: 각각 /admin/leave/overview, /admin/leave/policy로 리다이렉트

#### [✅] Test 13: 기존 관리 페이지 리다이렉트
**Test**: 기존 /users, /departments, /payroll, /reports, /files 경로가 사용자 권한에 따라 올바른 새 URL로 리다이렉트되는지 테스트
**Expected**: Supervisor는 /supervisor/* 경로로, Admin은 /admin/* 경로로 리다이렉트

### Phase 3: Navigation Component Tests

#### [✅] Test 14: Layout.tsx 사이드바 메뉴 링크 업데이트
**Test**: Layout.tsx의 사이드바 메뉴 링크가 새로운 URL 구조를 사용하는지 테스트
**Expected**: 모든 메뉴 링크가 새 URL 구조 사용

#### [✅] Test 15: 역할별 메뉴 표시
**Test**: 사용자 역할에 따라 적절한 메뉴 항목만 표시되는지 테스트
**Expected**: User는 공용/user 메뉴, Supervisor는 공용/user/supervisor 메뉴, Admin은 모든 메뉴 표시

### Phase 4: Page Component Link Tests

#### [✅] Test 16: Dashboard 페이지 내부 링크 업데이트
**Test**: Dashboard 페이지 내부의 navigate() 호출과 Link 컴포넌트가 새 URL 구조를 사용하는지 테스트
**Expected**: 모든 내부 링크가 새 URL 구조 사용

#### [✅] Test 17: Leave 관련 페이지 내부 링크 업데이트
**Test**: Leave 관련 페이지들의 내부 링크가 새 URL 구조를 사용하는지 테스트
**Expected**: 모든 내부 링크가 새 URL 구조 사용

#### [✅] Test 18: HR 관리 페이지 내부 링크 업데이트
**Test**: Users, Departments 페이지의 내부 링크가 새 URL 구조를 사용하는지 테스트
**Expected**: 모든 내부 링크가 새 URL 구조 사용

#### [✅] Test 19: Payroll 페이지 내부 링크 업데이트
**Test**: Payroll 페이지의 내부 링크가 새 URL 구조를 사용하는지 테스트
**Expected**: 모든 내부 링크가 새 URL 구조 사용

#### [✅] Test 20: Reports & Files 페이지 내부 링크 업데이트
**Test**: Reports, Files 페이지의 내부 링크가 새 URL 구조를 사용하는지 테스트
**Expected**: 모든 내부 링크가 새 URL 구조 사용

### Phase 5: Integration Tests

#### [✅] Test 21: 전체 페이지 접근 테스트
**Test**: 모든 새 URL 경로로 실제 페이지 접근이 가능한지 테스트
**Expected**: 모든 새 URL이 올바른 페이지를 렌더링
**Completed**: ✅ 통합 테스트 완료 - 모든 새 URL 경로 정상 접근 확인

#### [✅] Test 22: 권한별 접근 제한 통합 테스트
**Test**: 각 역할별로 접근 가능한 페이지와 접근 불가능한 페이지가 올바르게 제한되는지 통합 테스트
**Expected**: 권한 없는 페이지 접근 시 적절한 오류 또는 리다이렉트 발생
**Completed**: ✅ 권한 테스트 완료 - 역할별 접근 제한 정상 작동 확인

#### [✅] Test 23: 브라우저 뒤로가기/앞으로가기 테스트
**Test**: 새 URL 구조에서 브라우저 네비게이션이 올바르게 작동하는지 테스트
**Expected**: 브라우저 네비게이션이 정상 작동
**Completed**: ✅ 브라우저 네비게이션 테스트 완료 - 히스토리 오염 없이 정상 작동 확인

#### [✅] Test 24: 직접 URL 입력 테스트
**Test**: 새 URL을 브라우저 주소창에 직접 입력했을 때 올바르게 작동하는지 테스트
**Expected**: 직접 URL 입력 시 올바른 페이지 로드 또는 적절한 권한 오류
**Completed**: ✅ 직접 URL 입력 테스트 완료 - 모든 URL 직접 접근 및 권한 확인 정상 작동

### Phase 6: Documentation Update Tests

#### [✅] Test 25: PAGES.md 문서 업데이트 확인
**Test**: PAGES.md 파일이 새로운 URL 구조를 반영하여 업데이트되었는지 확인
**Expected**: 모든 페이지 URL이 새 구조로 문서화
**Completed**: ✅ PAGES.md 업데이트 완료 - 새 URL 구조, 리다이렉트 테이블, URL 원칙 문서화

#### [✅] Test 26: TEST_GUIDE.md 문서 업데이트 확인
**Test**: TEST_GUIDE.md의 테스트 시나리오가 새 URL 경로를 사용하도록 업데이트되었는지 확인
**Expected**: 모든 테스트 가이드가 새 URL 구조 반영
**Completed**: ✅ TEST_GUIDE.md 업데이트 완료 - URL 구조 테스트 섹션 추가, 포트 및 경로 수정

## Implementation Notes

- 각 테스트는 Red → Green → Refactor 사이클을 따름
- 한 번에 하나의 테스트만 구현
- 모든 테스트가 통과한 후에만 다음 테스트로 진행
- 리팩토링은 모든 테스트가 통과하는 상태에서만 수행
- 실제 MongoDB 데이터를 사용하여 테스트 (모킹 금지)

## Success Criteria

1. 모든 26개 테스트가 통과
2. 기존 URL에서 새 URL로 원활한 리다이렉트
3. 역할별 접근 권한이 정확히 작동
4. 모든 내부 링크가 새 URL 구조 사용
5. 문서가 새 구조를 정확히 반영