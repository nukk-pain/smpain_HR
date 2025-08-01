# Material-UI v7 Grid API 마이그레이션 계획

## 개요

HR 관리 시스템의 프론트엔드는 현재 Material-UI v7.2.0을 사용하고 있으며, TypeScript 컴파일 오류가 발생하고 있습니다. 주요 원인은 Material-UI v7에서 Grid API가 변경되어 기존의 `item` prop이 더 이상 지원되지 않기 때문입니다.

## 현재 상황 분석

### 영향받는 파일 (18개)
```
📁 components/ (12개 파일)
- BonusManagement.tsx
- DepartmentManagement.tsx  
- FileUpload.tsx
- IncentiveCalculator.tsx
- LeaveAdjustmentDialog.tsx
- PayrollDashboard.tsx
- PositionManagement.tsx
- SalesManagement.tsx
- TeamLeaveStatus.tsx
- UnifiedDashboard.tsx
- UserDashboard.tsx
- UserManagement.tsx

📁 pages/ (6개 파일)
- AdminBulkOperations.tsx
- AdminLeaveOverview.tsx
- AdminLeavePolicy.tsx  
- LeaveManagement.tsx
- PayrollManagement.tsx
- UserProfile.tsx
```

### 오류 통계
- **총 Grid 사용 횟수**: 285회
- **TypeScript 오류**: ~50+ Grid 관련 오류
- **영향 범위**: 전체 컴포넌트의 약 60%

## Material-UI v7 Grid 변경사항

### 1. 주요 API 변경
- **`item` prop 제거**: 모든 Grid는 자동으로 item으로 간주됨
- **CSS 변수 사용**: CSS 특이성 문제 해결
- **중첩 제한 제거**: 무제한 Grid 중첩 가능
- **네거티브 마진 제거**: 오버플로우 문제 해결

### 2. 마이그레이션 패턴
```tsx
// ❌ 기존 (v6 스타일)
<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    <Card>...</Card>
  </Grid>
  <Grid item xs={12} md={6}>
    <Card>...</Card>
  </Grid>
</Grid>

// ✅ 새로운 (v7 스타일)
<Grid container spacing={3}>
  <Grid xs={12} md={6}>
    <Card>...</Card>
  </Grid>
  <Grid xs={12} md={6}>
    <Card>...</Card>
  </Grid>
</Grid>
```

## 마이그레이션 실행 계획

### Phase 1: 자동 마이그레이션 도구 실행 (1시간)

#### Step 1.1: MUI 공식 Codemod 실행
```bash
cd /mnt/d/my_programs/HR/frontend
npx @mui/codemod v7.0.0/grid-props src/
```

#### Step 1.2: 자동 변환 검증
- Grid 컴포넌트 import 확인
- `item` prop 제거 확인
- 기본 레이아웃 구조 유지 확인

### Phase 2: 수동 마이그레이션 (2-3시간)

#### Step 2.1: 우선순위 컴포넌트 수정
**High Priority (핵심 UI)**
1. `UnifiedDashboard.tsx` - 메인 대시보드
2. `UserManagement.tsx` - 사용자 관리
3. `PayrollDashboard.tsx` - 급여 대시보드
4. `UserProfile.tsx` - 사용자 프로필

**Medium Priority (기능별 UI)**
5. `BonusManagement.tsx` - 상여금 관리
6. `SalesManagement.tsx` - 매출 관리
7. `DepartmentManagement.tsx` - 부서 관리
8. `IncentiveCalculator.tsx` - 인센티브 계산기

**Low Priority (관리자 UI)**
9. `AdminBulkOperations.tsx` - 관리자 일괄 작업
10. `AdminLeaveOverview.tsx` - 관리자 휴가 개요
11. `AdminLeavePolicy.tsx` - 관리자 휴가 정책

#### Step 2.2: 컴포넌트별 수정 작업
각 컴포넌트에 대해 다음 단계 수행:

1. **Grid import 확인**
   ```tsx
   import { Grid } from '@mui/material';
   ```

2. **`item` prop 제거**
   ```tsx
   // Before
   <Grid item xs={12} md={6}>
   
   // After  
   <Grid xs={12} md={6}>
   ```

3. **레이아웃 검증**
   - 반응형 동작 확인
   - spacing 속성 유지
   - 중첩 Grid 구조 검증

### Phase 3: 테스트 및 검증 (1시간)

#### Step 3.1: TypeScript 컴파일 검증
```bash
npm run build-check
```

#### Step 3.2: 시각적 레이아웃 검증
- 데스크톱 레이아웃 (1920px)
- 태블릿 레이아웃 (768px) 
- 모바일 레이아웃 (375px)

#### Step 3.3: 기능 테스트
- 대시보드 카드 레이아웃
- 폼 레이아웃 (Dialog 내부)
- 테이블과 그리드 조합
- 반응형 숨김/표시

### Phase 4: 품질 보증 (30분)

#### Step 4.1: 코드 품질 검사
```bash
npm run lint
npm run typecheck
```

#### Step 4.2: 성능 검증
- 빌드 크기 비교
- 런타임 성능 확인

## 예상 이슈 및 해결 방안

### 이슈 1: 복잡한 중첩 Grid 구조
**증상**: 다중 중첩된 Grid에서 레이아웃 깨짐
**해결**: 
- Grid container/item 구조 재설계
- 필요시 Box 컴포넌트로 대체

### 이슈 2: 반응형 브레이크포인트 동작 변경
**증상**: xs, sm, md, lg 브레이크포인트에서 예상과 다른 동작
**해결**:
- 각 브레이크포인트별 테스트
- 필요시 sx prop으로 미세 조정

### 이슈 3: Dialog 내부 Grid 레이아웃
**증상**: Modal/Dialog 내부의 Grid 레이아웃 문제
**해결**:
- Dialog 크기와 Grid 조합 재검토
- 필요시 Stack 컴포넌트 활용

## 롤백 계획

마이그레이션 실패 시 롤백 방안:

### Option 1: Git 롤백
```bash
git checkout HEAD~1  # 마지막 작업 전 상태로 복구
```

### Option 2: Material-UI v6로 다운그레이드
```bash
npm install @mui/material@^6.1.0 @mui/icons-material@^6.1.0
```

## 성공 기준

### 필수 기준
- [ ] TypeScript 컴파일 오류 0개
- [ ] 모든 페이지 정상 렌더링
- [ ] 반응형 레이아웃 정상 동작

### 품질 기준
- [ ] 시각적 레이아웃 변화 최소화
- [ ] 성능 저하 없음
- [ ] 접근성 기준 유지

## 타임라인

```
🕐 총 소요 시간: 4-5시간

Phase 1 (자동화): 1시간
├── Codemod 실행: 30분
└── 검증: 30분

Phase 2 (수동 작업): 2-3시간  
├── High Priority: 1시간
├── Medium Priority: 1시간
└── Low Priority: 1시간

Phase 3 (테스트): 1시간
├── 컴파일 검증: 15분
├── 시각적 검증: 30분
└── 기능 테스트: 15분

Phase 4 (QA): 30분
├── 코드 품질: 15분
└── 성능 검증: 15분
```

## 후속 작업

### 개선 사항
1. **Grid 사용 가이드라인 작성**
   - 팀 내 Grid 사용 표준 정의
   - 반응형 패턴 문서화

2. **컴포넌트 라이브러리 업데이트**
   - 자주 사용되는 Grid 패턴 컴포넌트화
   - 재사용 가능한 레이아웃 컴포넌트 생성

3. **성능 최적화**
   - Grid 렌더링 성능 모니터링
   - 필요시 가상화 적용

---

**작성일**: 2025-01-31  
**작성자**: Claude Code Assistant  
**버전**: 1.0  
**상태**: Ready for Implementation