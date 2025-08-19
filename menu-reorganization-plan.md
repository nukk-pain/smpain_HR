# 메뉴 재구성 계획 (Menu Reorganization Plan)

## 목표
Admin 사용자의 14개 메뉴를 기능별로 그룹화하여 사용성을 개선

## 현재 메뉴 구조 (평면 구조)
1. 대시보드
2. 내 휴가 관리
3. 휴가 달력
4. 내 문서함
5. 직원 휴가 현황
6. 직원 휴가 승인
7. 직원 관리
8. 부서 관리
9. 급여 관리
10. 보고서
11. 파일 관리
12. 전체 휴가 현황
13. 휴가 정책 설정
14. 문서 관리

## 새로운 메뉴 구조 (기능별 그룹화)

### 📊 홈
- 대시보드 (/dashboard)

### 👤 내 정보
- 내 휴가 관리 (/leave)
- 내 문서함 (/my-documents)

### 🏖️ 휴가 관리
- 휴가 달력 (/leave/calendar)
- 직원 휴가 현황 (/supervisor/leave/status)
- 직원 휴가 승인 (/supervisor/leave/requests)
- 전체 휴가 현황 (/admin/leave/overview) - Admin 전용

### 👥 조직 관리
- 직원 관리 (/supervisor/users)
- 부서 관리 (/supervisor/departments)

### 💰 급여 관리
- 급여 관리 (/supervisor/payroll)

### 📁 문서 관리
- 파일 관리 (/supervisor/files)
- 문서 관리 (/admin/documents) - Admin 전용

### 📈 보고서
- 보고서 (/supervisor/reports)

### ⚙️ 시스템 설정
- 휴가 정책 설정 (/admin/leave/policy) - Admin 전용

## 구현 계획

### 1단계: UI 컴포넌트 수정
- [ ] Layout.tsx에서 navigationItems 구조를 그룹 기반으로 변경
- [ ] Material-UI의 Collapse 컴포넌트를 사용한 그룹 접기/펼치기 기능 구현
- [ ] 그룹별 아이콘 및 색상 테마 적용

### 2단계: 상태 관리
- [ ] 그룹 펼침/접힘 상태를 localStorage에 저장
- [ ] 사용자별 선호 메뉴 그룹 설정 저장

### 3단계: 권한 처리
- [ ] Admin 전용 메뉴 항목 표시 로직 유지
- [ ] Supervisor/User 권한에 따른 그룹 필터링

### 4단계: UX 개선
- [ ] 현재 활성 페이지가 속한 그룹 자동 펼침
- [ ] 그룹 헤더 hover 효과 및 transition 애니메이션
- [ ] 모바일 반응형 디자인 최적화

## 기술 구현 상세

### navigationItems 데이터 구조 변경
```typescript
interface NavigationGroup {
  id: string
  title: string
  icon: React.ReactElement
  items: NavigationItem[]
  defaultExpanded?: boolean
}

interface NavigationItem {
  text: string
  path: string
  roles?: string[]
  permissions?: string[]
}
```

### Material-UI 컴포넌트 활용
- `List` / `ListItem` - 기본 메뉴 구조
- `Collapse` - 그룹 접기/펼치기
- `ListItemButton` - 그룹 헤더 클릭
- `ExpandLess` / `ExpandMore` - 펼침 상태 아이콘
- `Divider` - 그룹 간 구분선

## 예상 효과
1. **사용성 향상**: 관련 기능끼리 그룹화되어 원하는 메뉴를 빠르게 찾을 수 있음
2. **화면 공간 효율화**: 필요한 그룹만 펼쳐서 사용 가능
3. **확장성**: 새로운 기능 추가 시 적절한 그룹에 배치 용이
4. **일관성**: 기능별 그룹화로 직관적인 네비게이션 제공

## 주의사항
- 기존 URL 경로는 변경하지 않음 (라우팅 유지)
- 모든 권한 체크 로직 유지
- 기존 사용자 경험을 크게 해치지 않도록 점진적 개선