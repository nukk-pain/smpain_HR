# FIX-04: Bonus API 404 오류 수정 계획

## 📋 개요
- **생성일**: 2025년 08월 23일
- **완료일**: 2025년 08월 23일
- **우선순위**: HIGH
- **실제 소요**: 10분
- **상태**: ✅ 완료

## 🔴 문제 상황

### 오류 메시지
```
GET http://localhost:5455/api/payroll/bonuses/2025-08 404 (Not Found)
```

### 발생 위치
- **URL**: http://localhost:3727/supervisor/payroll (상여금-포상금 탭)
- **파일**: `/frontend/src/components/BonusManagement.tsx`
- **줄 번호**: 100번 줄

### 근본 원인
1. **엔드포인트 불일치**:
   - Frontend 요청: `/api/payroll/bonuses/${yearMonth}`
   - Backend 실제 경로: `/api/bonus/:year_month`
   
2. **날짜 형식 불일치**:
   - Frontend 전달: `2025-08` (yyyy-MM 형식)
   - Backend 기대값: `202508` (YYYYMM 형식)

## 🎯 해결 방법

### Step 1: API 엔드포인트 수정
```typescript
// BonusManagement.tsx 100번 줄
// 변경 전:
const response = await apiService.get(`/payroll/bonuses/${yearMonth}`);

// 변경 후:
const apiYearMonth = yearMonth.replace('-', '');  // '2025-08' → '202508'
const response = await apiService.get(`/bonus/${apiYearMonth}`);
```

### Step 2: 다른 bonus API 호출 확인 및 수정
- POST, PUT, DELETE 요청도 동일하게 엔드포인트 수정 필요
- yearMonth 형식 변환 적용

### Step 3: apiService 메서드 확인
- apiService가 `/api` prefix를 자동으로 추가하는지 확인
- 필요시 전체 경로 조정

## 📝 구현 체크리스트

- [x] BonusManagement.tsx의 loadBonuses 함수 수정
- [x] yearMonth 형식 변환 (yyyy-MM → YYYYMM)
- [x] 엔드포인트 경로 수정 (/payroll/bonuses → /bonus)
- [x] 다른 bonus 관련 API 호출 확인 및 수정 (PUT, DELETE, approve)
- [x] 필드명 매핑 수정 (user_id→userId, type→bonusType)
- [ ] 테스트: 상여금-포상금 탭 로드 확인
- [ ] 테스트: bonus CRUD 작업 정상 동작 확인

## 🔍 영향 범위
- BonusManagement 컴포넌트
- 상여금-포상금 관리 기능
- Supervisor 급여 관리 페이지

## ⚠️ 주의사항
- PayrollDashboard와 동일한 날짜 형식 이슈
- REFACTOR-02에서 API 구조 변경이 있었을 가능성
- Backend `/api/bonus` 라우트가 단수형임에 주의

## ✅ 실제 수정 내용

### 1. API 엔드포인트 수정
- GET `/payroll/bonuses/` → `/bonus/`
- PUT `/payroll/bonus/` → `/bonus/`
- DELETE `/payroll/bonus/` → `/bonus/`
- PUT `/payroll/bonus/{id}/approve` → `/bonus/{id}/approve`

### 2. 날짜 형식 변환
```typescript
// loadBonuses 함수
const apiYearMonth = yearMonth.replace('-', '');  // '2025-08' → '202508'
const response = await apiService.get(`/bonus/${apiYearMonth}`);
```

### 3. 필드명 매핑
```typescript
// handleSubmit 함수
const submitData = {
  userId: formData.user_id,  // Backend expects 'userId'
  yearMonth: formData.year_month.replace('-', ''),  
  bonusType: formData.type,  // Backend expects 'bonusType'
  amount: formData.amount,
  reason: formData.reason,
};
```

### 4. 수정 파일
- `/frontend/src/components/BonusManagement.tsx`
  - Lines 101-102: loadBonuses 날짜 변환
  - Lines 146-153: handleSubmit 필드 매핑
  - Line 147, 155, 182, 193: API 엔드포인트 경로