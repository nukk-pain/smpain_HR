# UnifiedLeaveOverview.tsx 최종 리팩토링 계획

## 🎯 목표
- **현재**: 762줄
- **목표**: 500줄 이하
- **감소량**: 262줄+ 제거 필요

## 📊 현재 구조 분석

### 라인별 분포
```
1-80:     Import 문 및 타입 정의 (80줄)
81-140:   Interface 정의 (60줄)  
141-230:  Component 정의 및 State (90줄)
231-355:  유틸리티 함수들 (124줄)
356-423:  이벤트 핸들러 (67줄)
424-445:  renderViewModeSelector (21줄)
446-550:  renderTeamView (104줄) 
551:      renderDepartmentView (1줄)
552-762:  메인 render 및 나머지 (210줄)
```

## 🔨 리팩토링 전략

### Phase 1: 타입 및 인터페이스 분리 ✅
- `types/leave.ts`로 이동 완료
- **절감**: 60줄

### Phase 2: 유틸리티 함수 분리 ✅
- `utils/leaveCalculations.ts`로 이동 완료  
- `utils/leaveFilters.ts`로 이동 완료
- **절감**: 추가 필요

### Phase 3: 뷰 컴포넌트 분리
#### 3-1: LeaveOverviewView 분리 ✅
- `components/leave/views/LeaveOverviewView.tsx` 생성 완료
- **절감**: 193줄

#### 3-2: TeamStatusView 분리
- `components/leave/views/TeamStatusView.tsx` 생성
- renderTeamView 함수 이동 (104줄)
- **절감 예상**: 104줄

#### 3-3: DepartmentStatsView 분리
- 현재 임시 Alert로 대체됨
- 나중에 필요시 구현

### Phase 4: 공통 컴포넌트 분리
#### 4-1: ViewModeSelector 분리
- `components/leave/ViewModeSelector.tsx` 생성
- renderViewModeSelector 함수 이동 (21줄)
- **절감 예상**: 21줄

#### 4-2: 이벤트 핸들러 최적화
- 중복 제거 및 통합
- **절감 예상**: 20줄

### Phase 5: Import 최적화
- 사용하지 않는 import 제거
- **절감 예상**: 15줄

## 📝 실행 순서

1. **TeamStatusView 컴포넌트 생성** (104줄 절감)
   - renderTeamView 로직 이동
   - props interface 정의
   - 메인 컴포넌트에서 호출

2. **ViewModeSelector 컴포넌트 생성** (21줄 절감)
   - renderViewModeSelector 로직 이동
   - props interface 정의

3. **유틸리티 함수 추가 이동** (50줄 절감)
   - calculateRiskDistribution → leaveCalculations.ts
   - calculateDepartmentStats → leaveCalculations.ts
   - calculateStatistics → leaveCalculations.ts
   - getStatusColor, getStatusLabel → leaveFilters.ts
   - getLeaveTypeLabel, getLeaveUsageColor → leaveFilters.ts

4. **Import 정리** (15줄 절감)
   - 사용하지 않는 MUI 컴포넌트 제거
   - 중복 import 제거

5. **코드 정리** (20줄 절감)
   - 빈 줄 제거
   - 주석 최소화
   - 인라인 최적화

## 🎯 예상 결과
- **시작**: 762줄
- **Phase 3-2**: 762 - 104 = 658줄
- **Phase 4-1**: 658 - 21 = 637줄  
- **Phase 5**: 637 - 50 = 587줄
- **Import 정리**: 587 - 15 = 572줄
- **코드 정리**: 572 - 20 = 552줄
- **최종**: ~550줄 (목표 달성)

## ✅ 체크리스트
- [ ] TeamStatusView 컴포넌트 생성
- [ ] ViewModeSelector 컴포넌트 생성
- [ ] 유틸리티 함수 추가 이동
- [ ] Import 최적화
- [ ] 코드 정리
- [ ] TypeScript 빌드 테스트
- [ ] 기능 동작 확인