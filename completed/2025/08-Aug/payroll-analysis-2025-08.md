# 급여 데이터 분석 보고서 (2025년 8월 14일)

## 문제 요약
1. 2025년 8월 급여 데이터가 입력하지 않았는데도 존재함
2. 2025년 6월 급여 데이터가 대시보드에 표시되지 않는다고 보고됨

## 조사 결과

### 1. 2025년 8월 급여 데이터 존재 이유

**발견 사항:**
- 2025년 8월 급여 데이터가 실제로 데이터베이스에 존재함
- 총 2개의 레코드 발견:
  1. ID: 689c3b2965a11e6a56ac9b60 - admin 계정, 급여: 3,500,000원
  2. ID: 6899685c0b4ae953357af5de - admin 계정, 급여: 3,000,000원 (다른 레코드)

**가능한 원인:**
- 테스트 데이터 입력 중 실수로 8월 데이터가 생성됨
- 파일 업로드 테스트 중 잘못된 월을 선택하여 데이터가 생성됨
- 개발/테스트 과정에서 미래 날짜로 데이터가 입력됨

### 2. 2025년 6월 급여 데이터 표시 문제

**발견 사항:**
- 2025년 6월 급여 데이터는 데이터베이스에 정상적으로 존재함
- API를 통해 데이터를 조회하면 정상적으로 반환됨
- 총 6명의 직원 데이터 확인 (경가영, 김채영, 신홍재 등)
- 통계 데이터도 정상적으로 계산됨:
  - 총 직원: 6명
  - 총 기본급: 12,636,650원
  - 총 인센티브: 3,570,000원
  - 총 지급액: 18,040,418원

**🔴 문제의 원인 발견:**
백엔드와 프론트엔드 간 필드명 불일치가 있습니다:

| 백엔드 응답 필드 | 프론트엔드 기대 필드 | 설명 |
|---|---|---|
| `bonus` | `bonus_total` | 상여금 |
| `award` | `award_total` | 포상금 |
| `total_input` | `input_total` | 총액 |

이로 인해 PayrollGrid 컴포넌트에서 데이터를 제대로 표시하지 못하고 있습니다.

**표시 문제 진단:**
- 백엔드 API는 정상 작동 중 ✅
- 데이터베이스에 데이터 존재 확인 ✅
- 프론트엔드가 데이터를 받지만 필드명 불일치로 표시 안 됨 ❌

## 기술적 세부사항

### API 엔드포인트 구조
- 월별 급여 조회: `GET /api/payroll/monthly/{year-month}`
- 급여 통계: `GET /api/payroll/stats/{year-month}`
- 모두 정상 작동 확인

### 데이터베이스 구조
- Collection: `payroll` (새 시스템)
- Collection: `monthlyPayments` (구 시스템)
- 두 컬렉션 모두 조회하여 데이터 통합

## 권장 조치사항

### 즉시 조치 필요
1. **2025년 8월 테스트 데이터 삭제**
   - 실제로 입력되지 않은 8월 데이터를 데이터베이스에서 제거
   - 삭제 전 백업 권장

2. **🔴 프론트엔드 필드명 매핑 수정 (긴급)**
   - PayrollGrid 컴포넌트에서 데이터 변환 시 필드명 매핑 추가
   - 백엔드 응답 필드를 프론트엔드 기대 필드로 변환
   ```javascript
   // PayrollGrid.tsx의 loadData 함수 수정 필요
   const transformedData = response.data.map((payment) => ({
     ...payment,
     bonus_total: payment.bonus || payment.bonus_total || 0,
     award_total: payment.award || payment.award_total || 0,
     input_total: payment.total_input || payment.input_total || 0,
     // 기타 필드 매핑
   }))
   ```

### 추가 확인 사항
1. **사용자 권한 확인**
   - supervisor 권한으로 접근 시 데이터 필터링 여부 확인
   - admin과 supervisor의 데이터 접근 권한 차이 검증

2. **브라우저 콘솔 에러 확인**
   - 프론트엔드에서 에러 발생 여부 확인
   - 네트워크 탭에서 API 응답 확인

## 테스트 방법

### 6월 데이터 확인
```bash
# API를 통한 직접 확인
curl -X GET "http://localhost:5455/api/payroll/monthly/2025-06" \
  -H "Authorization: Bearer {TOKEN}"
```

### 8월 데이터 삭제 (주의!)
```javascript
// MongoDB에서 직접 삭제 (백업 후 실행)
db.payroll.deleteMany({ 
  payMonth: ISODate("2025-08-01T00:00:00.000Z") 
})
```

## 결론
- 데이터베이스와 백엔드 API는 정상 작동 중
- 6월 데이터는 존재하며 API를 통해 정상 조회 가능
- 8월 데이터는 테스트 중 실수로 생성된 것으로 추정
- **🔴 프론트엔드 표시 문제의 근본 원인: 백엔드와 프론트엔드 간 필드명 불일치**
  - 백엔드 응답: `bonus`, `award`, `total_input`
  - 프론트엔드 기대: `bonus_total`, `award_total`, `input_total`
  - 이 불일치로 인해 PayrollGrid에서 데이터가 undefined로 표시됨