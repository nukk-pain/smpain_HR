# PayrollGrid 인쇄 미리보기 기능 구현 계획

## 개요
PayrollGrid 컴포넌트에 인쇄 미리보기 기능을 추가하여 급여 데이터를 효과적으로 인쇄할 수 있도록 한다.

## 현재 상황 분석
- PayrollGrid는 MUI DataGrid를 사용하여 급여 데이터를 표시 (AG Grid가 아님)
- expandable 섹션(수당, 공제)이 존재
- 컬럼 표시/숨기기 기능이 이미 구현되어 있음 (localStorage 저장)
- 체크박스 선택 기능 활성화 상태
- 페이지네이션 구현 (10, 20, 50 rows)
- Excel 내보내기 기능 존재
- 인라인 편집 기능 (Admin only)
- 툴바에 요약 통계 표시 (총 인원, 총 지급액)
- 복잡한 셀 렌더러 사용 (배경색, 특수 스타일링)
- todo-development.md에 인쇄 미리보기 기능이 Phase 3 선택적 개선사항으로 명시됨 (예상 소요시간: 10분)

## 사전 준비사항

### 1. FUNCTIONS_VARIABLES.md 검토
- 기존 인쇄 관련 함수 존재 여부 확인
- PayrollGrid 관련 유틸리티 함수 검토
- 재사용 가능한 다이얼로그 컴포넌트 확인

### 2. 실제 데이터 준비
- MongoDB에서 실제 급여 데이터 확인
- 테스트용 데이터셋 준비 (mock data 사용 금지)
- 다양한 케이스 준비 (많은 수당/공제, 적은 수당/공제 등)

## TDD 개발 계획

### Phase 1: 기본 인쇄 기능 테스트 및 구현 (15분)

#### Test 1: 인쇄 버튼 렌더링 테스트
```typescript
// PayrollGrid.test.tsx
test('should render print button', () => {
  const { getByLabelText } = render(<PayrollGrid yearMonth="2025-01" />)
  expect(getByLabelText('인쇄 미리보기')).toBeInTheDocument()
})
```

#### Implementation 1: 인쇄 버튼 추가
- PayrollGrid에 Print 아이콘 버튼 추가
- 툴바 영역에 배치

#### Test 2: 인쇄 함수 호출 테스트
```typescript
test('should call window.print when print button is clicked', () => {
  const printSpy = jest.spyOn(window, 'print').mockImplementation()
  const { getByLabelText } = render(<PayrollGrid yearMonth="2025-01" />)
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  expect(printSpy).toHaveBeenCalled()
})
```

#### Implementation 2: 인쇄 핸들러 구현
- handlePrint 함수 구현
- window.print() 호출

### Phase 2: Print CSS 스타일 구현 (20분)

#### Test 3: 인쇄 시 expandable 섹션 자동 확장 테스트
```typescript
test('should expand all sections before printing', () => {
  const { getByLabelText, container } = render(<PayrollGrid yearMonth="2025-01" />)
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  // Check if all expandable sections have expanded class
  const expandableSections = container.querySelectorAll('.expandable-section')
  expandableSections.forEach(section => {
    expect(section).toHaveClass('expanded-for-print')
  })
})
```

#### Implementation 3: 인쇄 전처리 로직
- 인쇄 전 모든 expandable 섹션 확장
- 인쇄 후 원래 상태로 복원

#### Test 4: Print CSS 스타일 적용 테스트
```typescript
test('should apply print-specific styles', () => {
  const { container } = render(<PayrollGrid yearMonth="2025-01" />)
  const printStyles = container.querySelector('style[data-print-styles]')
  expect(printStyles).toBeInTheDocument()
  expect(printStyles.textContent).toContain('@media print')
})
```

#### Implementation 4: Print CSS 스타일시트
- @media print 규칙 추가
- 불필요한 UI 요소 숨기기 (버튼, 메뉴 등)
- 페이지 여백 및 레이아웃 최적화

### Phase 3: 고급 인쇄 기능 (25분)

#### Test 5: 인쇄 미리보기 다이얼로그 테스트
```typescript
test('should show print preview dialog', async () => {
  const { getByLabelText, getByRole } = render(<PayrollGrid yearMonth="2025-01" />)
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  await waitFor(() => {
    expect(getByRole('dialog', { name: '인쇄 미리보기' })).toBeInTheDocument()
  })
})
```

#### Implementation 5: 인쇄 미리보기 다이얼로그
- PrintPreviewDialog 컴포넌트 생성
- 인쇄될 내용의 미리보기 표시
- 인쇄 옵션 (페이지 방향, 여백 등)

#### Test 6: 선택된 컬럼만 인쇄 테스트
```typescript
test('should only print visible columns', () => {
  const { getByLabelText, container } = render(<PayrollGrid yearMonth="2025-01" />)
  
  // Hide some columns
  const columnSettings = { employee_id: false, position: false }
  localStorage.setItem('payrollGridVisibleColumns', JSON.stringify(columnSettings))
  
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  const printContent = container.querySelector('.print-content')
  expect(printContent.querySelector('[data-field="employee_id"]')).not.toBeInTheDocument()
  expect(printContent.querySelector('[data-field="position"]')).not.toBeInTheDocument()
})
```

#### Implementation 6: 선택적 컬럼 인쇄
- visibleColumns 상태 활용
- 숨겨진 컬럼은 인쇄에서 제외

### Phase 4: 인쇄 레이아웃 최적화 (20분)

#### Test 7: 페이지 나누기 테스트
```typescript
test('should add page breaks for long tables', () => {
  // Mock large dataset
  const largeData = Array(100).fill(null).map((_, i) => mockPayrollData(i))
  const { container } = render(<PayrollGrid yearMonth="2025-01" data={largeData} />)
  
  const pageBreaks = container.querySelectorAll('.page-break')
  expect(pageBreaks.length).toBeGreaterThan(0)
})
```

#### Implementation 7: 자동 페이지 나누기
- 행 수에 따른 자동 페이지 나누기
- 헤더 반복 설정

#### Test 8: 인쇄 헤더/푸터 테스트
```typescript
test('should include print header and footer', () => {
  const { container } = render(<PayrollGrid yearMonth="2025-01" />)
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  expect(container.querySelector('.print-header')).toHaveTextContent('2025년 01월 급여 명세')
  expect(container.querySelector('.print-footer')).toHaveTextContent('인쇄일:')
})
```

#### Implementation 8: 인쇄 헤더/푸터
- 제목, 날짜, 페이지 번호 포함
- 회사 정보 추가 옵션

### Phase 5: 기존 기능과의 통합 (25분)

#### Test 9: 선택된 행만 인쇄 테스트
```typescript
test('should print only selected rows when option is enabled', () => {
  const { getByLabelText, getByTestId } = render(<PayrollGrid yearMonth="2025-01" />)
  
  // Select specific rows
  fireEvent.click(getByTestId('checkbox-row-1'))
  fireEvent.click(getByTestId('checkbox-row-3'))
  
  // Open print dialog and enable selected only
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  fireEvent.click(getByLabelText('선택된 항목만 인쇄'))
  
  const printContent = container.querySelector('.print-content')
  expect(printContent.querySelectorAll('.MuiDataGrid-row')).toHaveLength(2)
})
```

#### Implementation 9: 선택 행 인쇄 옵션
- 체크박스로 선택된 행만 인쇄하는 옵션 추가
- 인쇄 옵션 다이얼로그에 통합

#### Test 10: 페이지네이션 처리 테스트
```typescript
test('should handle pagination options correctly', () => {
  const { getByLabelText, getByRole } = render(<PayrollGrid yearMonth="2025-01" />)
  
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  // Check print options
  expect(getByRole('radio', { name: '현재 페이지만' })).toBeInTheDocument()
  expect(getByRole('radio', { name: '모든 페이지' })).toBeInTheDocument()
})
```

#### Implementation 10: 페이지네이션 인쇄 옵션
- 현재 페이지만 인쇄 vs 전체 페이지 인쇄 옵션
- 페이지 범위 지정 기능

#### Test 11: 요약 통계 포함 테스트
```typescript
test('should include summary statistics in print', () => {
  const { container } = render(<PayrollGrid yearMonth="2025-01" />)
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  
  const printSummary = container.querySelector('.print-summary')
  expect(printSummary).toHaveTextContent('총 9명')
  expect(printSummary).toHaveTextContent('총 지급액: 40,500,000원')
})
```

#### Implementation 11: 요약 통계 인쇄
- 툴바의 요약 통계를 인쇄 헤더에 포함
- 부서별 소계 옵션

### Phase 6: 고급 인쇄 옵션 (30분)

#### Test 12: 인쇄 보안 옵션 테스트
```typescript
test('should add watermark when security option is enabled', () => {
  const { getByLabelText, container } = render(<PayrollGrid yearMonth="2025-01" />)
  
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  fireEvent.click(getByLabelText('기밀 워터마크 추가'))
  
  expect(container.querySelector('.print-watermark')).toHaveTextContent('CONFIDENTIAL')
})
```

#### Implementation 12: 보안 기능
- 워터마크 추가 옵션 (기밀/초안)
- 인쇄 사용자 및 시간 기록
- 감사 로그 연동

#### Test 13: 스타일 옵션 테스트
```typescript
test('should apply custom print styles', () => {
  const { getByLabelText } = render(<PayrollGrid yearMonth="2025-01" />)
  
  fireEvent.click(getByLabelText('인쇄 미리보기'))
  fireEvent.click(getByLabelText('고대비 모드'))
  
  const printContent = container.querySelector('.print-content')
  expect(printContent).toHaveClass('high-contrast-print')
})
```

#### Implementation 13: 인쇄 스타일 옵션
- 고대비 모드
- 글꼴 크기 조정
- 색상/흑백 선택
- 셀 배경색 포함/제외 옵션

## 구현 순서 (TDD 사이클 준수)

각 Phase별로 다음 순서를 엄격히 준수:

1. **테스트 작성 (Red)**
   - 실패하는 테스트 먼저 작성
   - 실제 MongoDB 데이터 사용
   - 명확한 테스트 이름 사용

2. **최소 구현 (Green)**
   - 테스트를 통과하는 최소한의 코드만 작성
   - 과도한 기능 추가 금지
   - 모든 테스트 실행하여 통과 확인

3. **리팩토링 (Refactor)**
   - 테스트가 모두 통과한 상태에서만 진행
   - 구조적 변경과 동작 변경 분리
   - 각 리팩토링 후 테스트 재실행

4. **문서화**
   - 새로운 함수는 FUNCTIONS_VARIABLES.md에 추가
   - 재사용 가능한 컴포넌트 식별 및 문서화

## 구조적 변경과 동작 변경 분리

### 구조적 변경 (Tidy First)
- PrintPreviewDialog를 별도 파일로 분리
- 인쇄 관련 상태를 커스텀 훅으로 추출
- CSS 스타일을 별도 파일로 분리

### 동작 변경
- 인쇄 버튼 추가
- 인쇄 핸들러 구현
- 옵션 다이얼로그 기능 추가

각 변경사항은 별도로 커밋되어야 함

## 예상 코드 구조

### 1. PayrollGrid.tsx 수정
```typescript
// 인쇄 관련 상태 추가
const [isPrintMode, setIsPrintMode] = useState(false)
const [printDialogOpen, setPrintDialogOpen] = useState(false)
const [printOptions, setPrintOptions] = useState({
  selectedOnly: false,
  currentPageOnly: false,
  includeHeader: true,
  includeFooter: true,
  includeSummary: true,
  watermark: '',
  orientation: 'landscape',
  colorMode: 'color',
  fontSize: 'normal',
  includeBackgrounds: true
})

// 선택된 행 추적
const [selectedRows, setSelectedRows] = useState<number[]>([])

// 인쇄 핸들러
const handlePrint = useCallback(() => {
  // 이전 상태 저장
  const prevExpandedAllowances = new Set(expandedAllowances)
  const prevExpandedDeductions = new Set(expandedDeductions)
  
  // 1. 모든 expandable 섹션 확장
  setExpandedAllowances(new Set(rowData.map(row => row.id)))
  setExpandedDeductions(new Set(rowData.map(row => row.id)))
  
  // 2. 편집 모드 해제
  setEditingRows(new Set())
  
  // 3. 인쇄 모드 활성화
  setIsPrintMode(true)
  
  // 4. 다음 프레임에서 인쇄 실행
  setTimeout(() => {
    window.print()
    
    // 5. 인쇄 후 원래 상태 복원
    setIsPrintMode(false)
    setExpandedAllowances(prevExpandedAllowances)
    setExpandedDeductions(prevExpandedDeductions)
  }, 100)
}, [rowData, expandedAllowances, expandedDeductions])
```

### 2. Print 스타일시트
```css
@media print {
  /* 불필요한 요소 숨기기 */
  .MuiButton-root,
  .MuiIconButton-root,
  .column-settings-menu,
  .MuiDataGrid-footerContainer,
  .MuiDataGrid-columnHeaderTitleContainer button,
  .edit-buttons-container {
    display: none !important;
  }
  
  /* 테이블 스타일 최적화 */
  .MuiDataGrid-root {
    border: 1px solid #000;
    overflow: visible !important;
  }
  
  /* 페이지 설정 */
  @page {
    size: A4 landscape;
    margin: 1cm;
  }
  
  /* Expandable 섹션 강제 표시 */
  .expandable-content {
    display: block !important;
  }
  
  /* 배경색 유지 (옵션에 따라) */
  .print-with-backgrounds .MuiDataGrid-cell {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* 고대비 모드 */
  .high-contrast-print {
    * {
      color: #000 !important;
      background: #fff !important;
    }
    .MuiDataGrid-cell,
    .MuiDataGrid-columnHeader {
      border: 1px solid #000 !important;
    }
  }
  
  /* 워터마크 */
  .print-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 120px;
    opacity: 0.1;
    z-index: 1000;
  }
}
```

### 3. PrintPreviewDialog.tsx
```typescript
interface PrintPreviewDialogProps {
  open: boolean
  onClose: () => void
  onPrint: (options: PrintOptions) => void
  totalEmployees: number
  totalPayment: number
  selectedCount: number
}

const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({
  open, onClose, onPrint, totalEmployees, totalPayment, selectedCount
}) => {
  const [options, setOptions] = useState<PrintOptions>({
    selectedOnly: false,
    currentPageOnly: false,
    includeHeader: true,
    includeFooter: true,
    includeSummary: true,
    watermark: '',
    orientation: 'landscape',
    colorMode: 'color',
    fontSize: 'normal',
    includeBackgrounds: true
  })

  const handlePrint = () => {
    onPrint(options)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>인쇄 옵션</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          {/* 인쇄 범위 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>인쇄 범위</Typography>
            <RadioGroup value={options.selectedOnly ? 'selected' : 'all'}>
              <FormControlLabel 
                value="all" 
                control={<Radio />} 
                label={`전체 (${totalEmployees}명)`}
                onChange={() => setOptions({...options, selectedOnly: false})}
              />
              <FormControlLabel 
                value="selected" 
                control={<Radio />} 
                label={`선택된 항목만 (${selectedCount}명)`}
                disabled={selectedCount === 0}
                onChange={() => setOptions({...options, selectedOnly: true})}
              />
            </RadioGroup>
          </Grid>

          {/* 페이지 옵션 */}
          <Grid item xs={12}>
            <FormControlLabel
              control={<Checkbox checked={options.currentPageOnly} />}
              label="현재 페이지만 인쇄"
              onChange={(e, checked) => setOptions({...options, currentPageOnly: checked})}
            />
          </Grid>

          {/* 포함 항목 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>포함 항목</Typography>
            <FormControlLabel
              control={<Checkbox checked={options.includeSummary} />}
              label="요약 통계 포함"
            />
            <FormControlLabel
              control={<Checkbox checked={options.includeBackgrounds} />}
              label="셀 배경색 포함"
            />
          </Grid>

          {/* 보안 옵션 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>보안</Typography>
            <FormControl fullWidth size="small">
              <Select 
                value={options.watermark}
                onChange={(e) => setOptions({...options, watermark: e.target.value})}
              >
                <MenuItem value="">워터마크 없음</MenuItem>
                <MenuItem value="CONFIDENTIAL">기밀</MenuItem>
                <MenuItem value="DRAFT">초안</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 스타일 옵션 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>스타일</Typography>
            <FormControl component="fieldset">
              <RadioGroup row value={options.colorMode}>
                <FormControlLabel value="color" control={<Radio />} label="컬러" />
                <FormControlLabel value="grayscale" control={<Radio />} label="흑백" />
                <FormControlLabel value="highContrast" control={<Radio />} label="고대비" />
              </RadioGroup>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<Print />}>
          인쇄
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

## 예상 소요 시간
- 총 예상 시간: 2시간 5분
  - Phase 1: 15분 (기본 인쇄 기능)
  - Phase 2: 20분 (Print CSS 스타일)
  - Phase 3: 25분 (고급 인쇄 기능)
  - Phase 4: 20분 (인쇄 레이아웃 최적화)
  - Phase 5: 25분 (기존 기능과의 통합)
  - Phase 6: 30분 (고급 인쇄 옵션)

## 리스크 및 고려사항

1. **브라우저 호환성**
   - Chrome, Firefox, Safari에서 print 스타일 테스트 필요
   - IE는 지원하지 않음
   - MUI DataGrid의 인쇄 관련 이슈 확인 필요

2. **성능 고려사항**
   - 대량 데이터 인쇄 시 성능 최적화 필요
   - 모든 expandable 섹션 확장 시 메모리 사용량 증가
   - 페이지네이션과의 상호작용 처리

3. **사용자 경험**
   - 인쇄 중 로딩 표시
   - 인쇄 취소 시 상태 복원
   - 편집 중인 데이터의 처리

4. **기존 기능과의 충돌**
   - 컬럼 표시/숨기기 설정과의 동기화
   - 체크박스 선택 상태 유지
   - Excel 내보내기와의 일관성

5. **보안 및 감사**
   - 급여 정보 인쇄 시 감사 로그 필요
   - 권한 체크 (Admin/Supervisor만 인쇄 가능)
   - 워터마크 및 인쇄 정보 추가

## 테스트 전략

### 단위 테스트
- 각 컴포넌트의 개별 기능 테스트
- 인쇄 옵션 상태 변경 테스트
- 스타일 적용 여부 테스트

### 통합 테스트
- 전체 인쇄 플로우 테스트
- 실제 MongoDB 데이터로 테스트
- 다양한 브라우저에서 인쇄 출력 확인

### 수동 테스트 체크리스트
- [ ] Chrome에서 인쇄 미리보기 확인
- [ ] Firefox에서 인쇄 미리보기 확인
- [ ] Safari에서 인쇄 미리보기 확인
- [ ] 100명 이상 데이터로 성능 테스트
- [ ] 편집 중 인쇄 시 상태 복원 확인
- [ ] 권한별 접근 제어 확인

## 완료 기준
- [ ] 인쇄 버튼이 표시되고 클릭 가능
- [ ] 인쇄 시 모든 expandable 섹션 자동 확장
- [ ] 인쇄용 CSS 스타일 적용
- [ ] 선택된 컬럼만 인쇄 (visibleColumns 연동)
- [ ] 적절한 페이지 나누기
- [ ] 인쇄 옵션 다이얼로그 구현
- [ ] 선택된 행만 인쇄 옵션
- [ ] 페이지네이션 처리 (현재 페이지/전체)
- [ ] 요약 통계 포함
- [ ] 워터마크 및 보안 기능
- [ ] 스타일 옵션 (컬러/흑백/고대비)
- [ ] 편집 상태 해제 및 복원
- [ ] 감사 로그 기록
- [ ] 모든 테스트 통과

## 추가 고려사항

### MUI DataGrid 특화 처리
- DataGrid의 가상화 비활성화 처리
- 컬럼 헤더 고정 (페이지 나누기 시)
- 정렬 아이콘 숨기기

### 복잡한 셀 렌더러 처리
- ExpandableAllowances/Deductions 완전 확장
- 배경색이 있는 셀 (bonus_total, award_total 등) 인쇄 시 색상 유지
- 커스텀 스타일링 보존

### 데이터 필터링
- 현재 적용된 필터 상태 표시
- 필터된 데이터만 인쇄

### 인쇄 미리보기
- 실제 인쇄될 모습을 미리 확인
- 페이지 나누기 위치 표시
- 인쇄 전 최종 확인