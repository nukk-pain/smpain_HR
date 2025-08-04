# HR System URL 구조 개선 계획

## 목적
- URL 경로를 통해 각 페이지의 역할과 접근 권한을 명확히 구분
- 관리 및 유지보수 용이성 향상
- 일관된 URL 구조로 직관적인 탐색 제공

## 현재 상황 분석

### 현재 URL 구조
```
/dashboard          - 모든 역할 접근 가능
/profile           - 모든 역할 접근 가능
/leave             - 모든 역할 접근 가능
/leave-calendar    - 모든 역할 접근 가능
/team-leave-status - Manager, Admin만 접근
/employee-leave    - Manager, Admin만 접근
/payroll           - Admin, Manager만 접근
/users             - Admin, Manager만 접근
/departments       - Admin, Manager만 접근
/reports           - Admin, Manager만 접근
/files             - Admin, Manager만 접근
/admin/leave-overview - Admin만 접근
/admin/leave-policy   - Admin만 접근
```

### 문제점
1. URL만으로는 페이지의 접근 권한을 직관적으로 알기 어려움
2. 일부 Admin 전용 페이지만 `/admin/` 접두사 사용
3. Manager 권한 페이지는 별도 구분 없음

## 제안하는 새로운 URL 구조

### 역할별 접두사 적용
```
# 공용 페이지 (모든 인증된 사용자)
/dashboard
/profile

# User 역할 페이지
/user/leave
/user/leave-calendar

# Manager 역할 페이지
/manager/team-leave-status
/manager/employee-leave
/manager/payroll
/manager/users
/manager/departments
/manager/reports
/manager/files

# Admin 전용 페이지
/admin/leave-overview
/admin/leave-policy
/admin/payroll
/admin/users
/admin/departments
/admin/reports
/admin/files
```

### 대안: 기능별 그룹화 + 역할 구분
```
# 공용 페이지
/dashboard
/profile

# Leave 관련
/leave                    - 개인 휴가 관리 (모든 사용자)
/leave/calendar          - 휴가 캘린더 (모든 사용자)
/manager/leave/team      - 팀 휴가 현황 (Manager+)
/manager/leave/requests  - 휴가 승인 관리 (Manager+)
/admin/leave/overview    - 전체 휴가 현황 (Admin)
/admin/leave/policy      - 휴가 정책 관리 (Admin)

# HR 관리
/manager/users           - 사용자 관리 (Manager+)
/manager/departments     - 부서 관리 (Manager+)
/admin/users            - 전체 사용자 관리 (Admin)
/admin/departments      - 전체 부서 관리 (Admin)

# Payroll
/manager/payroll        - 팀 급여 관리 (Manager+)
/admin/payroll         - 전체 급여 관리 (Admin)

# Reports & Files
/manager/reports       - 팀 보고서 (Manager+)
/manager/files        - 팀 파일 관리 (Manager+)
/admin/reports        - 전체 보고서 (Admin)
/admin/files         - 전체 파일 관리 (Admin)
```

## 구현 계획

### 1단계: App.tsx 라우트 재구성
- 역할별 라우트 그룹 생성
- 새로운 URL 구조로 라우트 경로 변경
- 기존 URL에서 새 URL로 리다이렉트 설정 (하위 호환성)

### 2단계: 컴포넌트 내부 링크 업데이트
- Layout.tsx의 사이드바 메뉴 링크 업데이트
- 각 페이지 내부의 navigate() 호출 업데이트
- Link 컴포넌트의 to prop 업데이트

### 3단계: 문서 업데이트
- PAGES.md 파일 업데이트
- TEST_GUIDE.md의 URL 경로 업데이트
- 기타 관련 문서 수정

### 4단계: 테스트
- 모든 페이지 접근 테스트
- 역할별 접근 권한 테스트
- 리다이렉트 동작 확인

## 고려사항

### 장점
1. URL만으로 페이지의 역할과 권한을 명확히 파악 가능
2. 향후 권한 체계 변경 시 유연한 대응 가능
3. 개발자와 사용자 모두에게 직관적인 구조

### 단점 및 해결방안
1. **URL 길이 증가**: 깊은 계층 구조 대신 단순한 접두사 사용으로 최소화
2. **기존 북마크 무효화**: 리다이렉트로 해결
3. **SEO 영향**: 내부 시스템이므로 SEO는 고려사항이 아님

### 추가 고려사항
1. **공통 기능**: Dashboard와 Profile은 모든 사용자가 접근하므로 접두사 불필요
2. **권한 상속**: Manager는 User 페이지 접근 가능, Admin은 모든 페이지 접근 가능
3. **미래 확장성**: 새로운 역할 추가 시 쉽게 확장 가능한 구조

## 결정 필요 사항
1. 첫 번째 안(역할별 접두사)과 두 번째 안(기능별 그룹화) 중 선택
2. 리다이렉트 유지 기간
3. 구현 우선순위 및 일정