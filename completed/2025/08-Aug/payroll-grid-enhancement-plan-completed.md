# PayrollGrid 급여 현황 개선 계획

## 요구사항
1. 급여 관련 **모든 정보** 표시
2. "차이" 컬럼 제거
3. 급여 구성 요소를 상세하게 표시

## 현재 상태 분석

### 현재 표시되는 컬럼
| 컬럼명 | 필드명 | 설명 |
|--------|--------|------|
| 직원명 | employeeName | ✅ 유지 |
| 부서 | department | ✅ 유지 |
| 기본급 | base_salary | ✅ 유지 |
| 인센티브 | incentive | ✅ 유지 |
| 상여금 | bonus_total | ✅ 유지 |
| 포상금 | award_total | ✅ 유지 |
| 총액 | input_total | ✅ 유지 |
| 실제 지급액 | actual_payment | ✅ 유지 |
| 차이 | difference | ❌ 제거 |
| 작업 | actions | ✅ 유지 |

### 백엔드에서 제공 가능한 추가 필드

#### 수당 (Allowances) - 새 시스템(payroll 컬렉션)에서 제공
- `allowances.meal` - 식대
- `allowances.transportation` - 교통비
- `allowances.childCare` - 보육수당
- `allowances.overtime` - 연장근무수당
- `allowances.nightShift` - 야간근무수당
- `allowances.holidayWork` - 휴일근무수당
- `allowances.other` - 기타수당

#### 공제 (Deductions) - 새 시스템에서 제공
- `deductions.nationalPension` - 국민연금
- `deductions.healthInsurance` - 건강보험
- `deductions.employmentInsurance` - 고용보험
- `deductions.incomeTax` - 소득세
- `deductions.localIncomeTax` - 지방소득세

#### 기타 정보
- `employee_id` - 직원 ID
- `position` - 직급
- `sales_amount` - 매출액 (인센티브 계산 기준)

## 개선 방안

### 방안 1: 단순 컬럼 추가 (비추천)
모든 필드를 개별 컬럼으로 추가
- **문제점**: 너무 많은 컬럼으로 가독성 저하 (20개 이상)

### 방안 2: 그룹화된 표시 (추천) ✅
관련 필드를 그룹으로 묶어서 표시

#### 컬럼 구조 개선안
1. **기본 정보**
   - 직원명
   - 직원ID
   - 부서
   - 직급

2. **기본급**
   - 기본급 (편집 가능)

3. **수당 합계** (확장 가능)
   - 총 수당액 표시
   - 클릭 시 상세 내역 표시
     - 인센티브
     - 식대
     - 교통비
     - 보육수당
     - 연장근무수당
     - 기타

4. **상여/포상**
   - 상여금
   - 포상금

5. **공제 합계** (확장 가능)
   - 총 공제액 표시
   - 클릭 시 상세 내역 표시
     - 국민연금
     - 건강보험
     - 고용보험
     - 소득세
     - 지방소득세

6. **최종 금액**
   - 지급 총액 (기본급 + 수당 + 상여/포상)
   - 실 지급액 (지급 총액 - 공제)

7. **작업**
   - 편집/저장 버튼

### 방안 3: 탭 방식 (대안)
- 기본 탭: 핵심 정보만 표시
- 상세 탭: 모든 수당/공제 표시

## 구현 계획

### 1단계: 백엔드 API 수정
현재 백엔드가 새 시스템(payroll)의 allowances/deductions를 개별 필드로 변환하고 있음.
이를 객체 형태로도 제공하도록 수정:

```javascript
// backend/routes/payroll.js 수정
{
  ...payment,
  // 기존 필드들 유지
  base_salary: ...,
  incentive: ...,
  
  // 새 필드 추가
  allowances: {
    incentive: ...,
    meal: ...,
    transportation: ...,
    childCare: ...,
    overtime: ...,
    nightShift: ...,
    holidayWork: ...,
    other: ...
  },
  deductions: {
    nationalPension: ...,
    healthInsurance: ...,
    employmentInsurance: ...,
    incomeTax: ...,
    localIncomeTax: ...
  },
  
  // 계산된 값
  total_allowances: ..., // 모든 수당 합계
  total_deductions: ..., // 모든 공제 합계
}
```

### 2단계: 프론트엔드 PayrollGrid 수정

#### 2-1. 데이터 변환 로직 수정
```typescript
const transformedData = response.data.map((payment) => ({
  ...payment,
  // 필드 매핑
  employee_id: payment.employee_id || payment.employee?.employeeId,
  position: payment.position || payment.employee?.position,
  
  // 수당/공제 합계 계산
  total_allowances: calculateTotalAllowances(payment),
  total_deductions: calculateTotalDeductions(payment),
  
  // 기존 매핑 유지
  bonus_total: payment.bonus ?? payment.bonus_total ?? 0,
  award_total: payment.award ?? payment.award_total ?? 0,
  input_total: payment.total_input ?? payment.input_total ?? 0,
}))
```

#### 2-2. 컬럼 정의 수정
```typescript
const columns: GridColDef[] = [
  // 기본 정보
  { field: 'employeeName', headerName: '직원명', width: 100 },
  { field: 'employee_id', headerName: '직원ID', width: 80 },
  { field: 'department', headerName: '부서', width: 100 },
  { field: 'position', headerName: '직급', width: 80 },
  
  // 급여
  { field: 'base_salary', headerName: '기본급', width: 120 },
  
  // 수당 (확장 가능한 컬럼)
  { 
    field: 'total_allowances', 
    headerName: '수당',
    width: 120,
    renderCell: (params) => <ExpandableAllowances data={params.row} />
  },
  
  // 상여/포상
  { field: 'bonus_total', headerName: '상여금', width: 100 },
  { field: 'award_total', headerName: '포상금', width: 100 },
  
  // 공제 (확장 가능한 컬럼)
  { 
    field: 'total_deductions', 
    headerName: '공제',
    width: 120,
    renderCell: (params) => <ExpandableDeductions data={params.row} />
  },
  
  // 최종 금액
  { field: 'input_total', headerName: '지급총액', width: 130 },
  { field: 'actual_payment', headerName: '실지급액', width: 130 },
  
  // 작업
  { field: 'actions', headerName: '작업', width: 100 }
]
```

#### 2-3. 확장 가능한 컴포넌트 생성
```typescript
const ExpandableAllowances: React.FC = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Box>
      <Box onClick={() => setExpanded(!expanded)} sx={{ cursor: 'pointer' }}>
        {formatCurrency(data.total_allowances)}
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      {expanded && (
        <Box sx={{ pl: 2, fontSize: '0.85em' }}>
          <div>인센티브: {formatCurrency(data.incentive)}</div>
          <div>식대: {formatCurrency(data.allowances?.meal)}</div>
          <div>교통비: {formatCurrency(data.allowances?.transportation)}</div>
          {/* ... 기타 수당 */}
        </Box>
      )}
    </Box>
  );
};
```

### 3단계: 차이 컬럼 제거
- columns 배열에서 difference 필드 제거
- 관련 계산 로직 제거

## 예상 결과

### Before (현재)
```
직원명 | 부서 | 기본급 | 인센티브 | 상여금 | 포상금 | 총액 | 실제지급액 | 차이
```

### After (개선 후)
```
직원명 | 직원ID | 부서 | 직급 | 기본급 | 수당▼ | 상여금 | 포상금 | 공제▼ | 지급총액 | 실지급액
```

클릭 시 수당/공제 상세 표시:
```
수당 ▼
  인센티브: 500,000원
  식대: 100,000원
  교통비: 50,000원
  ...
```

## 구현 우선순위

### Phase 1 (필수)
1. ✅ 차이 컬럼 제거
2. ✅ 직원ID, 직급 컬럼 추가
3. ✅ 컬럼 너비 최적화

### Phase 2 (권장)
1. 백엔드 API 수정하여 allowances/deductions 객체 제공
2. 수당/공제 합계 표시
3. 확장 가능한 상세 내역 구현

### Phase 3 (선택)
1. 컬럼 커스터마이징 기능
2. 엑셀 내보내기 시 전체 상세 포함
3. 인쇄 미리보기 기능

## 예상 소요 시간
- Phase 1: 30분
- Phase 2: 2시간
- Phase 3: 1시간

## 리스크
- **낮음**: Phase 1은 단순 UI 변경
- **중간**: Phase 2는 백엔드 API 수정 필요
- **해결책**: Phase별 단계적 구현으로 리스크 최소화