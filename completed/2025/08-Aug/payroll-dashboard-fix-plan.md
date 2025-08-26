# PayrollDashboard 데이터 표시 문제 해결 계획

## 문제 분석

### 현재 상황
- **증상**: 대시보드 탭에서 급여 통계가 표시되지 않음
- **급여 현황 탭**: 정상 작동 (PayrollGrid 컴포넌트)
- **대시보드 탭**: 데이터 없음 (PayrollDashboard 컴포넌트)

### 근본 원인
PayrollDashboard 컴포넌트가 백엔드 API 응답 구조를 잘못 해석하고 있음

#### 백엔드 API 응답 구조 (`/api/reports/payroll/{year-month}`)
```json
{
  "success": true,
  "data": {
    "reportData": [...],  // 개별 직원 급여 데이터 배열
    "summary": {          // 요약 통계 (여기가 필요한 데이터!)
      "totalEmployees": 6,
      "totalBaseSalary": 12636650,
      "totalIncentive": 3570000,
      "totalBonus": 0,
      "totalAward": 0,
      "totalPayroll": 18040418,
      "avgSalary": 3006736
    },
    "generatedAt": "...",
    "generatedBy": "...",
    "yearMonth": "2025-06"
  }
}
```

#### PayrollDashboard의 현재 코드
```typescript
// 잘못된 부분
const response = await apiService.getPayrollReport(yearMonth);
if (response.success) {
  setStats(response.data);  // ❌ 전체 data 객체를 stats로 설정
}
```

#### PayrollDashboard가 기대하는 stats 구조
```typescript
interface PayrollStats {
  totalEmployees: number;     // ✅ summary.totalEmployees
  totalBaseSalary: number;    // ✅ summary.totalBaseSalary
  totalIncentive: number;     // ✅ summary.totalIncentive
  totalBonus: number;         // ✅ summary.totalBonus
  totalAward: number;         // ✅ summary.totalAward
  totalPayroll: number;       // ✅ summary.totalPayroll
  departmentStats: DepartmentStat[];  // ❓ 백엔드에서 제공하지 않음
  monthlyTrends: MonthlyTrend[];     // ❓ 백엔드에서 제공하지 않음
  topPerformers: TopPerformer[];     // ❓ 백엔드에서 제공하지 않음
}
```

## 해결 방안

### 방안 1: 프론트엔드만 수정 (단기 해결책) ✅ 추천

**장점:**
- 빠른 수정 가능
- 백엔드 변경 불필요
- 리스크 최소

**단점:**
- 일부 기능 제한 (부서별 통계, 월별 트렌드, 상위 성과자 표시 불가)

**구현 방법:**
```typescript
// PayrollDashboard.tsx 수정
const loadStats = async () => {
  setLoading(true);
  try {
    const response = await apiService.getPayrollReport(yearMonth);
    if (response.success && response.data.summary) {
      // summary 데이터를 stats 구조에 맞게 변환
      const statsData: PayrollStats = {
        ...response.data.summary,
        departmentStats: [],  // 빈 배열로 초기화
        monthlyTrends: [],    // 빈 배열로 초기화
        topPerformers: []     // 빈 배열로 초기화
      };
      setStats(statsData);
    }
  } catch (error) {
    showNotification('error', 'Error', 'Failed to load payroll statistics');
  } finally {
    setLoading(false);
  }
};
```

### 방안 2: 백엔드 API 개선 (장기 해결책)

**장점:**
- 완전한 기능 구현
- 프론트엔드 기대 구조와 일치

**단점:**
- 백엔드 수정 필요
- 테스트 범위 확대

**구현 방법:**
백엔드에서 departmentStats, monthlyTrends, topPerformers 계산 로직 추가

### 방안 3: 하이브리드 접근 (최적 해결책)

1. **즉시**: 방안 1 적용하여 기본 통계 표시
2. **이후**: reportData를 활용하여 프론트엔드에서 추가 통계 계산

**구현 방법:**
```typescript
const loadStats = async () => {
  setLoading(true);
  try {
    const response = await apiService.getPayrollReport(yearMonth);
    if (response.success && response.data) {
      const { summary, reportData } = response.data;
      
      // 부서별 통계 계산
      const departmentMap = new Map();
      reportData.forEach(emp => {
        const dept = emp.department || '기타';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, {
            department: dept,
            employeeCount: 0,
            totalSalary: 0,
            averageSalary: 0
          });
        }
        const deptStat = departmentMap.get(dept);
        deptStat.employeeCount++;
        deptStat.totalSalary += emp.totalInput || 0;
      });
      
      // 평균 계산
      departmentMap.forEach(stat => {
        stat.averageSalary = stat.employeeCount > 0 
          ? stat.totalSalary / stat.employeeCount 
          : 0;
      });
      
      const statsData: PayrollStats = {
        ...summary,
        departmentStats: Array.from(departmentMap.values()),
        monthlyTrends: [],  // TODO: 여러 달 데이터 필요
        topPerformers: reportData
          .sort((a, b) => (b.totalInput || 0) - (a.totalInput || 0))
          .slice(0, 5)
          .map(emp => ({
            name: emp.name,
            department: emp.department,
            totalPay: emp.totalInput || 0,
            incentive: emp.incentive || 0,
            performance: 0  // 성과 데이터 없음
          }))
      };
      
      setStats(statsData);
    }
  } catch (error) {
    showNotification('error', 'Error', 'Failed to load payroll statistics');
  } finally {
    setLoading(false);
  }
};
```

## 구현 순서

### 1단계: 기본 수정 (5분)
```typescript
// PayrollDashboard.tsx line 91
// 변경 전:
setStats(response.data);

// 변경 후:
setStats({
  ...response.data.summary,
  departmentStats: [],
  monthlyTrends: [],
  topPerformers: []
});
```

### 2단계: 테스트
1. 대시보드 탭에서 기본 통계 표시 확인
   - 총 직원 수
   - 총 급여
   - 총 인센티브
   - 평균 급여

### 3단계: 향상된 기능 추가 (선택적)
reportData를 활용한 부서별 통계 및 상위 성과자 계산

## 예상 결과

### 수정 전
- 대시보드에 "No payroll data available for 2025-06" 메시지 표시

### 수정 후
- 총 직원 수: 6명
- 총 급여: 18,040,418원
- 총 인센티브: 3,570,000원
- 평균 급여: 3,006,736원

## 리스크 평가

- **낮음**: 읽기 전용 컴포넌트 수정
- **영향 범위**: PayrollDashboard 컴포넌트만
- **롤백**: 한 줄 수정이므로 쉽게 되돌리기 가능

## 결론

**추천 방안: 방안 3 (하이브리드)**
1. 즉시 방안 1을 적용하여 기본 통계 표시
2. reportData를 활용하여 부서별 통계와 상위 성과자 표시 추가
3. 월별 트렌드는 추후 백엔드 API 개선 시 추가