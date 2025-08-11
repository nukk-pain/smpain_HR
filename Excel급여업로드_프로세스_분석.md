# Excel 급여 업로드 프로세스 상세 분석

## 🎯 전체 프로세스 개요

Admin이 Excel 파일을 업로드하면 다음과 같은 단계를 거쳐 각 직원의 급여 정보가 데이터베이스에 기록되고, 모든 직원이 조회할 수 있게 됩니다.

## 📋 1단계: Excel 파일 업로드 (Frontend)

### 업로드 경로
```
/supervisor/files → Excel 업로드 인터페이스
```

### Frontend 처리
- **파일 검증**: `.xlsx`, `.xls` 형식만 허용, 최대 10MB
- **Drag & Drop 지원**: 사용자 친화적 업로드 인터페이스
- **년월 설정**: 2025-08 (기본값)
- **API 호출**: `POST /api/payroll/excel/upload`

## 🔧 2단계: 백엔드 파일 처리

### 권한 및 보안 검증
```javascript
// 파일: /backend/routes/payroll-enhanced.js:511-516
router.post('/excel/upload', 
  requireAuth,                    // JWT 인증 필요
  requirePermission('payroll:manage'), // Admin 권한 필요
  strictRateLimiter,             // 업로드 속도 제한
  preventNoSQLInjection,         // NoSQL 인젝션 방지
  upload.single('file'),         // 파일 업로드 처리
  // ... 처리 로직
);
```

### 파일 저장
- **임시 저장 경로**: `/backend/uploads/temp/`
- **파일 검증**: 업로드된 파일 존재 여부 확인

## 📊 3단계: Excel 데이터 파싱 (LaborConsultantParser)

### 특수 파싱 로직
```javascript
// 파일: /backend/utils/laborConsultantParser.js
const parser = new LaborConsultantParser();
const parsedData = await parser.parsePayrollFile(req.file.path);
```

### 듀얼 로우 구조 처리
**연세신명 급여대장 전용 형식 지원:**

#### 메인 로우 (일반 급여 정보)
- **A열**: 연번
- **B열**: 성명 (직원 이름)
- **C열**: 고용일
- **K열**: 기본급
- **L열**: 연장근로수당
- **M열**: 휴일근로수당
- **Q열**: 연차휴가수당

#### 인센티브 로우 (추가 급여 정보)
- **C열**: 주민번호
- **H열**: 추가연장수당
- **K열**: 야간수당
- **L열**: 추가연장수당
- **N열**: 인센티브 **⭐ 핵심 데이터**
- **P열**: 추가수당
- **Q열**: 포상금 **⭐ 핵심 데이터**

### 데이터 변환
```javascript
// 완전한 수당 구조로 변환
allowances: {
  overtime: (overtimeAllowance || 0) + (additionalOvertimeAllowance || 0),
  holiday: (holidayAllowance || 0) + (holidayOvertimeAllowance || 0),
  night: nightAllowance || 0,
  meal: mealAllowance || 0,
  annualLeave: annualLeaveAllowance || 0,
  
  // 🎯 인센티브 필드들 - 중요!
  fixedIncentive: fixedIncentive || 0,
  incentive: incentive || 0,        // 실제 인센티브
  bonusReward: bonusReward || 0,    // 포상금
  retroactivePay: retroactivePay || 0,
  additionalAllowance: additionalAllowance || 0
}
```

## 🔍 4단계: 직원 매칭 및 검증

### 직원 식별 프로세스
```javascript
// 파일: /backend/routes/payroll-enhanced.js:544-561
for (const record of payrollRecords) {
  let user = null;
  
  // 1차: 사번으로 찾기
  if (record.employeeId) {
    user = await userCollection.findOne({ employeeId: record.employeeId });
  }
  
  // 2차: 이름으로 찾기 (fallback)
  if (!user && record.employeeName) {
    user = await userCollection.findOne({ name: record.employeeName });
  }
  
  // 매칭 실패시 오류 기록
  if (!user) {
    errors.push({
      record: record.employeeName || record.employeeId,
      error: 'Employee not found in system'
    });
    continue;
  }
  
  // 급여 레코드 생성 진행...
}
```

## 💾 5단계: 데이터베이스 저장 (PayrollRepository)

### 급여 레코드 생성
```javascript
// 파일: /backend/repositories/PayrollRepository.js:19-55
const payrollData = {
  userId: user._id,                    // MongoDB ObjectId
  year: record.year,                   // 2025
  month: record.month,                 // 8
  baseSalary: record.baseSalary,       // 기본급
  allowances: record.allowances,       // 모든 수당 (인센티브 포함)
  deductions: record.deductions,       // 모든 공제
  netSalary: record.netSalary,         // 실수령액
  paymentStatus: 'pending',            // 초기 상태
  createdBy: new ObjectId(req.user.id), // 업로드한 관리자 ID
  sourceFile: record.sourceFile,       // 소스 파일 정보
  extractedAt: record.extractedAt      // 추출 시간
};

await payrollRepo.createPayroll(payrollData);
```

### 자동 계산 및 검증
```javascript
// 중복 체크
const existing = await this.findOne({
  userId: payrollData.userId,
  year: payrollData.year,
  month: payrollData.month
});

if (existing) {
  throw new Error('Payroll record already exists for this user and period');
}

// 자동 총계 계산
const totalAllowances = Object.values(allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
const totalDeductions = Object.values(deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
const netSalary = (baseSalary || 0) + totalAllowances - totalDeductions;
```

## 📤 6단계: 업로드 결과 반환

### 응답 구조
```javascript
{
  "success": true,
  "message": "Excel file processed successfully. 3 records imported.",
  "totalRecords": 3,
  "successfulImports": 3,
  "errors": [], // 오류가 있을 경우 상세 정보
  "summary": {
    "fileName": "연세신명통증의학과_2025년_06월_임금대장_제출.xlsx",
    "fileSize": 125439,
    "processedAt": "2025-08-11T03:49:00.000Z",
    "year": 2025,
    "month": 6
  }
}
```

## 🔍 7단계: Admin 급여 조회 시스템

### API 엔드포인트: `GET /api/payroll`

### 역할별 접근 제어
```javascript
// 파일: /backend/routes/payroll-enhanced.js:178-182
if (userRole === 'user' || userRole === 'User') {
  filter.userId = new ObjectId(currentUserId); // 사용자: 본인만
} else if (userId) {
  filter.userId = new ObjectId(userId);         // 관리자: 특정 사용자 또는 전체
}
```

### Admin 전체 조회 가능한 정보
```javascript
// MongoDB Aggregation Pipeline으로 사용자 정보 조인
const pipeline = [
  { $match: filter },
  {
    $lookup: {
      from: 'users',           // users 컬렉션과 조인
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      userId: 1,
      year: 1, month: 1,
      baseSalary: 1,
      allowances: 1,           // 모든 수당 (인센티브 포함)
      deductions: 1,           // 모든 공제
      totalAllowances: 1,
      totalDeductions: 1,
      netSalary: 1,
      paymentStatus: 1,
      paymentDate: 1,
      'user.name': 1,          // 직원 이름
      'user.employeeId': 1,    // 사번
      'user.department': 1,    // 부서
      'user.position': 1       // 직책
    }
  }
];
```

## 📱 8단계: 직원별 급여 조회

### 동일한 API, 다른 권한
- **URL**: `GET /api/payroll`
- **User 권한**: 본인 데이터만 조회 (`filter.userId = currentUserId`)
- **Admin 권한**: 전체 데이터 조회 가능

### 반환 데이터 구조
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "6899685c0b4ae953357af5de",
      "userId": "689568757421ba94ed63f706",
      "year": 2025,
      "month": 8,
      "baseSalary": 3000000,
      "allowances": {
        "overtime": 100000,
        "position": 200000,
        "meal": 150000,
        "transportation": 100000,
        "incentive": 250000,      // 인센티브
        "bonusReward": 100000,    // 포상금
        "other": 0
      },
      "deductions": {
        "nationalPension": 150000,
        "healthInsurance": 120000,
        "employmentInsurance": 50000,
        "incomeTax": 250000,
        "localIncomeTax": 25000,
        "other": 0
      },
      "totalAllowances": 800000,
      "totalDeductions": 595000,
      "netSalary": 3205000,       // 실수령액
      "paymentStatus": "approved",
      "user": {
        "name": "신홍재",
        "employeeId": "EMP001",
        "department": "간호, 원무",
        "position": "간호사"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

## 🛡️ 보안 및 에러 처리

### 보안 메커니즘
1. **JWT 인증**: 모든 API 호출에 토큰 필요
2. **권한 기반 접근 제어**: Admin만 업로드, User는 본인만 조회
3. **Rate Limiting**: 업로드 속도 제한 (10 req/5min)
4. **파일 검증**: 형식, 크기, 내용 검증
5. **NoSQL 인젝션 방지**: 입력 데이터 살균

### 에러 처리
```javascript
// 업로드 중 발생할 수 있는 에러들
errors = [
  {
    record: "김철수",
    error: "Employee not found in system"
  },
  {
    record: "이영희", 
    error: "Payroll record already exists for this period"
  }
];
```

## 📊 데이터베이스 스키마

### payroll 컬렉션 구조
```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // users 컬렉션 참조
  year: Number,                  // 2025
  month: Number,                 // 8
  baseSalary: Number,           // 기본급
  allowances: {
    overtime: Number,            // 연장근로수당
    holiday: Number,            // 휴일수당
    night: Number,              // 야간수당
    meal: Number,               // 식대
    transportation: Number,     // 교통비
    annualLeave: Number,        // 연차수당
    fixedIncentive: Number,     // 고정인센티브
    incentive: Number,          // 변동인센티브 ⭐
    bonusReward: Number,        // 포상금 ⭐
    retroactivePay: Number,     // 소급분
    additionalAllowance: Number, // 추가수당
    other: Number               // 기타수당
  },
  deductions: {
    nationalPension: Number,     // 국민연금
    healthInsurance: Number,     // 건강보험
    employmentInsurance: Number, // 고용보험
    incomeTax: Number,          // 소득세
    localIncomeTax: Number,     // 지방소득세
    other: Number               // 기타공제
  },
  totalAllowances: Number,      // 총 수당 (자동 계산)
  totalDeductions: Number,      // 총 공제 (자동 계산)
  netSalary: Number,           // 실수령액 (자동 계산)
  paymentStatus: String,       // 'pending', 'approved', 'paid'
  paymentDate: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,         // 업로드한 관리자
  approvedBy: ObjectId,        // 승인한 관리자
  sourceFile: String,          // 원본 파일명
  extractedAt: Date            // 데이터 추출 시간
}
```

## ✅ 성공 시나리오 요약

1. **Admin 로그인** → Excel 파일 선택 → 업로드
2. **파일 파싱** → 듀얼로우 구조에서 모든 급여 정보 추출
3. **직원 매칭** → 이름/사번으로 시스템 사용자 식별
4. **데이터베이스 저장** → 각 직원별 급여 레코드 생성
5. **Admin 조회** → 모든 직원의 급여 현황 확인 가능
6. **직원 조회** → 각 직원은 본인의 급여만 조회 가능

## 🚫 실패 시나리오 및 대응

1. **직원 매칭 실패** → 에러 목록에 기록, 계속 진행
2. **중복 데이터** → 기존 데이터 보호, 에러 메시지 반환
3. **파일 형식 오류** → 업로드 거부, 명확한 에러 메시지
4. **권한 없음** → 401/403 에러, 접근 차단
5. **서버 오류** → 자세한 로그 기록, 일반적 에러 메시지 반환

이 전체 프로세스를 통해 Excel 파일 하나로 모든 직원의 급여 정보가 시스템에 안전하게 기록되고, 역할에 따른 적절한 접근 권한으로 조회할 수 있는 완전한 급여 관리 시스템이 구축되어 있습니다.