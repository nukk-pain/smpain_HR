# Phase 3: PayrollGrid 고급 기능 구현 계획

## 구현 목표
Phase 3에서는 사용자 경험을 향상시키는 고급 기능들을 추가합니다.

## 1. Excel 내보내기 (전체 상세 포함)

### 현재 상태
- 기본 Excel 내보내기 버튼은 있으나 기능 미구현
- "Excel 내보내기 기능은 곧 구현됩니다" 메시지만 표시

### 구현 계획

#### 1-1. 백엔드 Excel Export API
```javascript
// backend/routes/payroll.js
router.get('/monthly/:yearMonth/export', async (req, res) => {
  // Excel 파일 생성 (xlsx 라이브러리 사용)
  // 모든 수당/공제 상세를 개별 컬럼으로 포함
  // 헤더: 직원명, 직원ID, 부서, 직급, 기본급, 
  //       식대, 교통비, 보육수당, 연장근무, 야간근무, 휴일근무, 기타수당,
  //       국민연금, 건강보험, 고용보험, 소득세, 지방소득세,
  //       상여금, 포상금, 지급총액, 실지급액
});
```

#### 1-2. 프론트엔드 Excel Export 함수
```typescript
const handleExportExcel = async () => {
  try {
    const response = await apiService.exportPayrollExcel(yearMonth);
    // Blob으로 받아서 다운로드
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_${yearMonth}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    showError('Excel 내보내기 실패');
  }
};
```

## 2. 컬럼 커스터마이징 기능

### 구현 계획

#### 2-1. 컬럼 Visibility 토글
```typescript
interface ColumnVisibility {
  employeeName: boolean;
  employee_id: boolean;
  department: boolean;
  position: boolean;
  base_salary: boolean;
  allowances: boolean;
  deductions: boolean;
  bonus_total: boolean;
  award_total: boolean;
  input_total: boolean;
  actual_payment: boolean;
}

// LocalStorage에 사용자 설정 저장
const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
  () => JSON.parse(localStorage.getItem('payrollColumnVisibility') || '{}')
);
```

#### 2-2. 컬럼 설정 UI
```typescript
<Menu>
  <MenuItem>
    <FormControlLabel
      control={<Checkbox checked={columnVisibility.employee_id} />}
      label="직원ID 표시"
      onChange={(e) => toggleColumn('employee_id')}
    />
  </MenuItem>
  {/* 다른 컬럼들... */}
</Menu>
```

## 3. 인쇄 미리보기 기능

### 구현 계획

#### 3-1. Print CSS 스타일
```css
@media print {
  .no-print { display: none; }
  .payroll-grid { 
    page-break-inside: avoid;
    font-size: 10pt;
  }
  .expanded-details {
    display: block !important; /* 인쇄 시 모든 상세 표시 */
  }
}
```

#### 3-2. Print Preview 함수
```typescript
const handlePrintPreview = () => {
  // 모든 expandable 섹션 일시적으로 확장
  const allRowIds = rowData.map(r => r.id);
  setExpandedAllowances(new Set(allRowIds));
  setExpandedDeductions(new Set(allRowIds));
  
  // 인쇄 다이얼로그 열기
  setTimeout(() => {
    window.print();
    // 인쇄 후 원래 상태로 복원
    setExpandedAllowances(new Set());
    setExpandedDeductions(new Set());
  }, 100);
};
```

## 구현 우선순위

1. **Excel 내보내기** (가장 중요)
   - 사용자가 데이터를 외부에서 분석할 수 있도록 함
   - 모든 상세 정보 포함

2. **컬럼 커스터마이징** (중요)
   - 사용자별 선호도에 맞춘 화면 구성
   - 불필요한 정보 숨기기

3. **인쇄 미리보기** (선택)
   - 보고서 출력 기능
   - 전체 데이터 인쇄

## 예상 시간
- Excel 내보내기: 30분
- 컬럼 커스터마이징: 20분
- 인쇄 미리보기: 10분

## 시작 순서
1. Excel 내보내기 백엔드 API 구현
2. Excel 내보내기 프론트엔드 연동
3. 컬럼 커스터마이징 UI 추가
4. 인쇄 미리보기 스타일 추가