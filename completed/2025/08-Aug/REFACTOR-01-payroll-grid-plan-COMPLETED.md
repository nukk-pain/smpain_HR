# PayrollGrid 컴포넌트 리팩토링 상세 실행 계획

## 📊 현재 상태 분석
- **파일**: `frontend/src/components/PayrollGrid.tsx`
- **현재 크기**: 1,059줄
- **목표 크기**: 300-400줄
- **PrintPreviewDialog**: ✅ 이미 분리 완료 (260줄)

## 🎯 리팩토링 목표
1. 핵심 컴포넌트를 300-400줄로 축소
2. 기능별 모듈 분리로 유지보수성 향상
3. 재사용 가능한 유틸리티 함수 추출
4. TypeScript 타입 안정성 강화

## 📝 작업 계획 (TDD 적용)

### Phase 1: 타입 및 상수 분리 (Day 1 - 오전)
**파일**: `PayrollTypes.ts` (예상 80줄)

#### 1.1 테스트 작성
```typescript
// PayrollTypes.test.ts
describe('PayrollTypes', () => {
  it('should export PayrollRowData interface', () => {
    // Type checking test
  })
  it('should export column visibility defaults', () => {
    expect(DEFAULT_VISIBLE_COLUMNS).toBeDefined()
  })
})
```

#### 1.2 추출할 내용
- [ ] `PayrollRowData` interface
- [ ] `PayrollGridProps` interface
- [ ] `DEFAULT_VISIBLE_COLUMNS` 상수
- [ ] `STORAGE_KEYS` 상수
- [ ] 기타 타입 정의

**예상 감소**: 50줄

---

### Phase 2: 유틸리티 함수 분리 (Day 1 - 오전)
**파일**: `utils/payrollFormatters.ts` (예상 60줄)

#### 2.1 테스트 작성
```typescript
// payrollFormatters.test.ts
describe('payrollFormatters', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(1000)).toBe('1,000원')
    expect(formatCurrency(null)).toBe('0원')
  })
})
```

#### 2.2 추출할 함수
- [ ] `formatCurrency()`
- [ ] `currencyFormatter()`
- [ ] `parseExcelDate()`
- [ ] `validatePayrollData()`

**예상 감소**: 60줄

---

### Phase 3: 계산 로직 분리 (Day 1 - 오후)
**파일**: `utils/payrollCalculations.ts` (예상 150줄)

#### 3.1 테스트 작성
```typescript
// payrollCalculations.test.ts
describe('payrollCalculations', () => {
  it('should calculate total allowances', () => {
    const allowances = { meal: 10000, transport: 5000 }
    expect(calculateTotalAllowances(allowances)).toBe(15000)
  })
  it('should calculate net salary', () => {
    expect(calculateNetSalary(1000000, 50000, 100000)).toBe(950000)
  })
})
```

#### 3.2 추출할 함수
- [ ] `calculateTotalAllowances()`
- [ ] `calculateTotalDeductions()`
- [ ] `calculateIncentive()`
- [ ] `calculateNetSalary()`
- [ ] `calculateInputTotal()`
- [ ] `validateCalculations()`

**예상 감소**: 150줄

---

### Phase 4: AG Grid 설정 분리 (Day 1 - 오후)
**파일**: `config/payrollGridConfig.ts` (예상 200줄)

#### 4.1 테스트 작성
```typescript
// payrollGridConfig.test.ts
describe('payrollGridConfig', () => {
  it('should define all required columns', () => {
    const columns = getColumnDefinitions()
    expect(columns).toContainEqual(
      expect.objectContaining({ field: 'employeeName' })
    )
  })
})
```

#### 4.2 추출할 내용
- [ ] Column definitions 배열
- [ ] Cell renderers 설정
- [ ] Grid 기본 옵션
- [ ] Column visibility 로직
- [ ] Sort/Filter 설정

**예상 감소**: 200줄

---

### Phase 5: 서브 컴포넌트 분리 (Day 2 - 오전)

#### 5.1 ExpandableAllowances 컴포넌트
**파일**: `PayrollExpandableAllowances.tsx` (예상 80줄)
- [ ] 컴포넌트 추출
- [ ] Props 인터페이스 정의
- [ ] 테스트 작성

#### 5.2 ExpandableDeductions 컴포넌트
**파일**: `PayrollExpandableDeductions.tsx` (예상 80줄)
- [ ] 컴포넌트 추출
- [ ] Props 인터페이스 정의
- [ ] 테스트 작성

#### 5.3 EditableCellRenderer 컴포넌트
**파일**: `PayrollEditableCell.tsx` (예상 60줄)
- [ ] 컴포넌트 추출
- [ ] 입력 검증 로직 포함
- [ ] 테스트 작성

**예상 감소**: 220줄

---

### Phase 6: 액션 버튼 컴포넌트 분리 (Day 2 - 오후)
**파일**: `PayrollActionButtons.tsx` (예상 100줄)

#### 6.1 테스트 작성
```typescript
describe('PayrollActionButtons', () => {
  it('should render edit button when not editing', () => {})
  it('should render save/cancel when editing', () => {})
})
```

#### 6.2 추출할 내용
- [ ] ActionCellRenderer 컴포넌트
- [ ] 툴바 버튼 그룹
- [ ] 컬럼 설정 메뉴

**예상 감소**: 100줄

---

### Phase 7: 데이터 훅 분리 (Day 2 - 오후)
**파일**: `hooks/usePayrollData.ts` (예상 120줄)

#### 7.1 테스트 작성
```typescript
describe('usePayrollData', () => {
  it('should fetch payroll data', async () => {})
  it('should handle save operations', async () => {})
})
```

#### 7.2 추출할 내용
- [ ] `fetchPayrollData()` 로직
- [ ] `handleSave()` 로직
- [ ] `handleBulkUpdate()` 로직
- [ ] Error handling
- [ ] Loading state 관리

**예상 감소**: 120줄

---

### Phase 8: 통합 및 정리 (Day 3 - 오전)

#### 8.1 Main Component 재구성
- [ ] Import 정리
- [ ] 추출된 컴포넌트 연결
- [ ] Props drilling 최소화
- [ ] Context API 적용 검토

#### 8.2 최종 구조
```typescript
// PayrollGrid.tsx (목표: 350줄)
- Import statements (20줄)
- Main component setup (30줄)
- State management (50줄)
- Event handlers (100줄)
- Render logic (150줄)
```

---

## 📋 체크리스트

### Day 1 (8시간)
- [ ] Phase 1: PayrollTypes.ts 생성 및 테스트
- [ ] Phase 2: payrollFormatters.ts 생성 및 테스트
- [ ] Phase 3: payrollCalculations.ts 생성 및 테스트
- [ ] Phase 4: payrollGridConfig.ts 생성 및 테스트
- [ ] 중간 테스트: 기능 정상 작동 확인

### Day 2 (8시간)
- [ ] Phase 5: 서브 컴포넌트 3개 분리
- [ ] Phase 6: PayrollActionButtons.tsx 분리
- [ ] Phase 7: usePayrollData 훅 생성
- [ ] 통합 테스트: 전체 기능 검증

### Day 3 (4시간)
- [ ] Phase 8: 최종 통합 및 정리
- [ ] 성능 테스트
- [ ] 문서 업데이트 (FUNCTIONS_VARIABLES.md)
- [ ] PR 준비

---

## 🎯 예상 결과

### 파일 구조
```
frontend/src/
├── components/
│   ├── PayrollGrid.tsx (350줄)
│   ├── PayrollExpandableAllowances.tsx (80줄)
│   ├── PayrollExpandableDeductions.tsx (80줄)
│   ├── PayrollEditableCell.tsx (60줄)
│   └── PayrollActionButtons.tsx (100줄)
├── config/
│   └── payrollGridConfig.ts (200줄)
├── hooks/
│   └── usePayrollData.ts (120줄)
├── types/
│   └── PayrollTypes.ts (80줄)
└── utils/
    ├── payrollFormatters.ts (60줄)
    └── payrollCalculations.ts (150줄)
```

### 총 라인 수
- **변경 전**: 1,059줄 (단일 파일)
- **변경 후**: 1,280줄 (10개 파일)
  - 메인 컴포넌트: 350줄
  - 나머지: 평균 103줄

### 개선 효과
1. **유지보수성**: 각 파일이 단일 책임 원칙 준수
2. **테스트 용이성**: 모듈별 단위 테스트 가능
3. **재사용성**: 유틸리티 함수 다른 컴포넌트에서 활용 가능
4. **가독성**: 각 파일 200줄 이하로 관리 용이

---

## ⚠️ 주의사항

1. **기능 보존**: 모든 기존 기능이 정상 작동해야 함
2. **타입 안정성**: TypeScript 에러 없이 컴파일되어야 함
3. **성능**: 리팩토링 후 성능 저하가 없어야 함
4. **호환성**: 다른 컴포넌트와의 연동 유지

## 🔄 롤백 계획

문제 발생 시:
1. Git stash 또는 branch 활용
2. 각 Phase별 커밋으로 단계별 롤백 가능
3. 백업 브랜치: `refactor/payroll-grid-backup`

---

## 📝 진행 상황 추적

INDEX-PLAN.md 업데이트:
- Phase 완료 시마다 체크리스트 업데이트
- 일일 진행률 기록
- 문제 발생 시 이슈 기록