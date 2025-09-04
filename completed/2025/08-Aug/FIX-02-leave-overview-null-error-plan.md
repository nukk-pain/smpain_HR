# FIX-02: UnifiedLeaveOverview null 참조 오류 수정 계획

## 📋 개요
- **생성일**: 2025년 08월 23일
- **우선순위**: HIGH
- **예상 소요**: 30분
- **상태**: 🔴 진행 중

## 🔴 문제 상황

### 오류 메시지
```javascript
Uncaught TypeError: Cannot read properties of null (reading 'toFixed')
    at UnifiedLeaveOverview.tsx:613:73
```

### 발생 위치
- **URL**: http://localhost:3727/leave/overview
- **파일**: `/frontend/src/components/UnifiedLeaveOverview.tsx`
- **줄 번호**: 613번 줄

### 근본 원인
- `employee.usageRate`가 null 또는 undefined일 때 `.toFixed(1)` 메서드 호출
- 백엔드에서 usageRate 계산이 실패했거나 데이터가 없는 경우 발생

## 🎯 해결 방법

### Step 1: Null 체크 추가 (Quick Fix)
```typescript
// 613번 줄 수정
// 변경 전:
<Typography variant="body2">{employee.usageRate.toFixed(1)}%</Typography>

// 변경 후:
<Typography variant="body2">{(employee.usageRate ?? 0).toFixed(1)}%</Typography>
```

### Step 2: 데이터 검증 강화
```typescript
// 상위 컴포넌트에서 데이터 검증
const safeEmployeeData = employees.map(employee => ({
  ...employee,
  usageRate: employee.usageRate ?? 0,
  remainingDays: employee.remainingDays ?? 0,
  usedDays: employee.usedDays ?? 0
}))
```

### Step 3: LinearProgress 컴포넌트 보호
```typescript
// 611번 줄도 함께 수정
<LinearProgress
  variant="determinate"
  value={Math.min(100, Math.max(0, employee.usageRate ?? 0))}
  sx={{ flexGrow: 1 }}
  color={
    (employee.usageRate ?? 0) > 80 ? 'error' : 
    (employee.usageRate ?? 0) > 50 ? 'warning' : 
    'success'
  }
/>
```

## 📝 구현 체크리스트

- [ ] UnifiedLeaveOverview.tsx 613번 줄 null 체크 추가
- [ ] LinearProgress 값 검증 (611번 줄)
- [ ] 데이터 변환 함수에 기본값 설정
- [ ] 테스트: null 데이터로 페이지 로드
- [ ] 테스트: 정상 데이터로 페이지 로드

## 🔍 추가 확인 사항

### 다른 null 가능성 있는 필드들
- `employee.remainingDays`
- `employee.usedDays`
- `employee.totalDays`
- `employee.name`
- `employee.department`

### 백엔드 API 응답 검증
- `/api/leave/overview` 응답에서 usageRate 필드 확인
- null 값이 오는 경우 백엔드에서도 수정 필요

## 📊 영향 범위
- UnifiedLeaveOverview 컴포넌트
- UnifiedLeaveOverviewTable 컴포넌트 (있다면)
- 휴가 현황 대시보드 전체

## ⚠️ 주의사항
- usageRate가 0일 때와 null일 때 UI 표시 방법 결정 필요
- 백엔드에서 null이 오는 원인도 함께 조사 필요