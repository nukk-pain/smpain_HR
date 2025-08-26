# 급여 필드명 불일치 해결 방안

## 문제 상황
백엔드 API 응답과 프론트엔드 기대 필드명이 불일치하여 데이터가 표시되지 않음

| 백엔드 응답 | 프론트엔드 기대 | 설명 |
|------------|---------------|------|
| `bonus` | `bonus_total` | 상여금 |
| `award` | `award_total` | 포상금 |
| `total_input` | `input_total` | 총액 |

## 사용 현황 분석

### 프론트엔드 사용 현황
- **영향 범위**: 2개 파일
  - `/frontend/src/types/index.ts` - 타입 정의
  - `/frontend/src/components/PayrollGrid.tsx` - 컴포넌트

### 백엔드 사용 현황
- **영향 범위**: 16개 파일, 64개 위치
- 주요 사용처:
  - MongoDB aggregation pipelines
  - Excel 파싱 서비스
  - 보고서 생성
  - API 응답 구조

## 해결 방안 비교

### 방안 1: 프론트엔드 수정 (추천) ✅

**장점:**
- 영향 범위가 작음 (2개 파일만 수정)
- 백엔드 로직 변경 없음
- 기존 데이터베이스 구조 유지
- 리스크가 낮음

**단점:**
- 프론트엔드와 백엔드 간 필드명 불일치가 계속 존재
- 향후 개발 시 혼란 가능성

**구현 방법:**
```typescript
// PayrollGrid.tsx의 loadData 함수 수정
const transformedData: PayrollRowData[] = response.data.map((payment: any) => ({
  ...payment,
  // 백엔드 필드를 프론트엔드 필드로 매핑
  bonus_total: payment.bonus ?? payment.bonus_total ?? 0,
  award_total: payment.award ?? payment.award_total ?? 0,
  input_total: payment.total_input ?? payment.input_total ?? 0,
  // 기존 필드 유지
  id: payment._id || payment.id || `row-${index}`,
  employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown',
  department: payment.employee?.department || '-',
}))
```

### 방안 2: 백엔드 수정 (비추천) ❌

**장점:**
- 프론트엔드와 백엔드 간 일관성 확보
- 향후 개발 시 명확한 필드명

**단점:**
- 영향 범위가 큼 (16개 파일, 64개 위치)
- 데이터베이스 마이그레이션 필요 가능성
- Excel 업로드/파싱 로직 수정 필요
- 테스트 범위가 넓음
- 리스크가 높음

### 방안 3: 백엔드 응답 변환 레이어 추가 (중간안)

**장점:**
- 내부 로직 변경 없음
- 점진적 마이그레이션 가능
- API 응답만 변환

**단점:**
- 추가 코드 복잡도
- 성능 오버헤드 (미미함)

**구현 방법:**
```javascript
// backend/routes/payroll.js의 응답 부분만 수정
const transformedData = combinedPayrollData.map(item => ({
  ...item,
  bonus_total: item.bonus,
  award_total: item.award,
  input_total: item.total_input,
  // 기존 필드도 유지 (하위 호환성)
  bonus: item.bonus,
  award: item.award,
  total_input: item.total_input
}));

res.json({ success: true, data: transformedData });
```

## 추천 해결 방안: 방안 1 (프론트엔드 수정)

### 이유
1. **최소 영향 원칙**: 가장 적은 수의 파일 수정으로 문제 해결
2. **리스크 최소화**: 백엔드 로직이나 데이터베이스 변경 없음
3. **즉시 적용 가능**: 테스트 범위가 작고 배포가 간단
4. **롤백 용이**: 문제 발생 시 쉽게 되돌릴 수 있음

### 구현 단계

#### 1단계: PayrollGrid.tsx 수정
```typescript
// frontend/src/components/PayrollGrid.tsx
const loadData = useCallback(async () => {
  setLoading(true)
  try {
    const response = await apiService.getMonthlyPayments(yearMonth)
    if (response.success && response.data) {
      const transformedData: PayrollRowData[] = response.data.map((payment: any, index: number) => {
        // 필드 매핑 추가
        const mappedPayment = {
          ...payment,
          // 백엔드 필드를 프론트엔드 필드로 매핑
          bonus_total: payment.bonus ?? payment.bonus_total ?? 0,
          award_total: payment.award ?? payment.award_total ?? 0,
          input_total: payment.total_input ?? payment.input_total ?? 0,
          // ID 필드 매핑
          id: payment._id || payment.id || `row-${index}`,
          employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown',
          department: payment.employee?.department || '-',
        }
        return mappedPayment
      })
      setRowData(transformedData)
    } else {
      setRowData([])
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      showError('데이터를 불러오는 중 오류가 발생했습니다')
    } else {
      setRowData([])
    }
  } finally {
    setLoading(false)
  }
}, [yearMonth, showError])
```

#### 2단계: 타입 정의 업데이트 (선택적)
```typescript
// frontend/src/types/index.ts
export interface MonthlyPayment {
  id: number | string;  // MongoDB ID 지원
  employee_id?: number;  // 선택적
  user_id?: string;      // MongoDB 필드 추가
  year_month: string;
  base_salary: number;
  incentive: number;
  // 양쪽 필드명 모두 지원
  bonus_total?: number;
  bonus?: number;
  award_total?: number;
  award?: number;
  input_total?: number;
  total_input?: number;
  actual_payment?: number;
  difference?: number;
  created_at?: string;
  updated_at?: string;
  employee?: User;
}
```

#### 3단계: 테스트
1. 2025년 6월 데이터가 정상 표시되는지 확인
2. 다른 월 데이터도 정상 작동하는지 확인
3. 수정/저장 기능이 정상 작동하는지 확인

## 장기 개선 방안

### 1. API 문서화
- OpenAPI/Swagger 스펙 작성
- 필드명 표준화 가이드 작성

### 2. DTO 패턴 도입
- 백엔드: Response DTO 클래스 생성
- 프론트엔드: API 응답 변환 레이어

### 3. 점진적 마이그레이션
- 새로운 API 엔드포인트는 일관된 필드명 사용
- 기존 엔드포인트는 점진적으로 개선

## 즉시 조치 사항

1. **PayrollGrid.tsx 수정** - 필드 매핑 로직 추가
2. **테스트** - 6월 데이터 표시 확인
3. **문서화** - 필드 매핑 관계를 FUNCTIONS_VARIABLES.md에 기록

## 예상 소요 시간
- 구현: 10분
- 테스트: 20분
- 총: 30분