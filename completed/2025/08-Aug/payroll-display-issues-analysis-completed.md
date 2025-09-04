# Payroll Display Issues Analysis

## Issue #1: 직원명이 "Unknown"으로 표시되는 문제

### 원인 분석
프론트엔드와 백엔드 간 데이터 구조 불일치

#### 프론트엔드 기대 구조 (PayrollGrid.tsx:257)
```typescript
employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown'
```
프론트엔드는 `employee` 객체 내부의 `full_name` 또는 `username` 필드를 찾고 있음

#### 백엔드 실제 반환 구조 (/api/payroll/monthly/:year_month)
```javascript
// monthlyPayments collection (old system)
{
  id: '$_id',
  name: { $arrayElemAt: ['$user.name', 0] },
  username: { $arrayElemAt: ['$user.username', 0] },
  ...
}

// payroll collection (new system - Excel uploads)  
{
  id: '$_id',
  name: { $arrayElemAt: ['$user.name', 0] },
  username: { $arrayElemAt: ['$user.username', 0] },
  ...
}
```
백엔드는 `name`과 `username`을 최상위 필드로 직접 반환하고 있음

### 해결 방법
두 가지 옵션:

#### Option 1: 백엔드 수정 (권장)
백엔드에서 `employee` 객체 구조로 래핑하여 반환:
```javascript
{
  id: '$_id',
  employee: {
    full_name: { $arrayElemAt: ['$user.name', 0] },
    username: { $arrayElemAt: ['$user.username', 0] },
    department: { $arrayElemAt: ['$user.department', 0] }
  },
  ...
}
```

#### Option 2: 프론트엔드 수정
PayrollGrid.tsx에서 데이터 변환 로직 수정:
```typescript
employeeName: payment.name || payment.employee?.full_name || payment.employee?.username || 'Unknown'
department: payment.department || payment.employee?.department || '-'
```

---

## Issue #2: 대시보드 총합이 표시되지 않는 문제

### 원인 분석
대시보드 통계 API 엔드포인트 부재

#### 프론트엔드 API 호출 (api.ts:394)
```typescript
async getDashboardStats() {
  return this.get('/admin/stats/system');
}
```

#### 백엔드 상태
- `/api/admin/stats/system` 엔드포인트가 존재하지 않음
- 대시보드 통계를 계산하는 로직이 구현되지 않음

### 필요한 통계 데이터
PayrollManagement.tsx에서 사용하는 필드:
- `total_employees`: 총 직원 수
- `total_payroll`: 당월 총 급여
- `pending_uploads`: 대기 중인 업로드
- `current_month`: 현재 월

### 해결 방법

#### 새로운 엔드포인트 생성 필요
`/api/admin/stats/system` 엔드포인트를 생성하여 다음 정보 반환:

```javascript
router.get('/stats/system', requireAuth, async (req, res) => {
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // 총 직원 수 계산
  const totalEmployees = await db.collection('users').countDocuments({
    role: { $ne: 'admin' }
  });
  
  // 당월 총 급여 계산 (두 컬렉션 모두 조회)
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  
  // monthlyPayments collection
  const monthlyStats = await db.collection('monthlyPayments').aggregate([
    { $match: { yearMonth: currentMonth } },
    { $group: { _id: null, total: { $sum: '$actualPayment' } } }
  ]).toArray();
  
  // payroll collection  
  const payrollStats = await db.collection('payroll').aggregate([
    { $match: { year, month } },
    { $group: { _id: null, total: { $sum: '$netSalary' } } }
  ]).toArray();
  
  const totalPayroll = 
    (monthlyStats[0]?.total || 0) + 
    (payrollStats[0]?.total || 0);
  
  // 대기 중인 업로드 계산
  const pendingUploads = await db.collection('payrollUploads').countDocuments({
    processed: false
  });
  
  res.json({
    success: true,
    data: {
      total_employees: totalEmployees,
      total_payroll: totalPayroll,
      pending_uploads: pendingUploads,
      current_month: currentMonth
    }
  });
});
```

---

## 데이터 모델 불일치 근본 원인

### 문제의 핵심
현재 시스템에 두 개의 분리된 payroll 시스템이 존재:

1. **구 시스템 (monthlyPayments collection)**
   - 수동 입력 방식
   - `yearMonth` 문자열 필드 사용 (예: "2025-06")
   - employee 정보를 lookup으로 join

2. **신 시스템 (payroll collection)**
   - Excel 업로드 방식
   - `year`, `month` 숫자 필드 분리
   - 다른 스키마 구조 (allowances, deductions 객체)

### 권장 사항
1. **단기 해결**: 위 수정사항 적용으로 즉시 문제 해결
2. **장기 해결**: 두 시스템을 하나로 통합
   - 하나의 collection으로 마이그레이션
   - 일관된 스키마 사용
   - API 응답 구조 통일

---

## 구현 우선순위

1. **즉시 수정 필요**
   - 백엔드 `/api/payroll/monthly/:year_month` 응답 구조 수정 (employee 객체 추가)
   - 백엔드 `/api/admin/stats/system` 엔드포인트 생성

2. **추후 개선 사항**
   - 두 payroll 시스템 통합
   - 프론트엔드 타입 정의 강화
   - API 응답 구조 표준화