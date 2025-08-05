# 사용자 생성 필드 정의

## 사용자 생성 시 입력받는 정보

### 기본 인증 정보
```typescript
username: string;        // 사용자명 (로그인 ID, 2-30자, 영문/숫자/한글/_/- 허용)
password: string;        // 비밀번호 (1-25자)
name: string;           // 실명 (2-50자)
role: string;           // 역할 ('admin', 'supervisor', 'user')
```

### 인사 정보
```typescript
employeeId: string;     // 사원번호 (자동 생성됨 - 입사년도+순번, 예: 20250001)
hireDate: string;       // 입사일 (YYYY-MM-DD 형식, employeeId 생성 기준)
department: string;     // 부서명
position: string;       // 직책/직위
```

### 조직 관계
```typescript
managerId: string;      // 상급자 ID (해당 직원의 직속 상사 ObjectId, 휴가승인/권한관리용)
```

### 계약 및 급여 정보
```typescript
contractType: string;   // 계약 유형 ('regular', 'contract', 'intern')
baseSalary: number;     // 기본급 (숫자)
incentiveFormula: string; // 인센티브 공식
accountNumber: string;  // 급여 지급 계좌번호
```

### 개인 정보 (선택사항)
```typescript
birthDate: string;      // 생년월일 (YYYY-MM-DD 형식)
phoneNumber: string;    // 전화번호 (010-XXXX-XXXX 형식)
```

### 시스템 설정
```typescript
visibleTeams: string[]; // 접근 가능한 팀/부서 목록 (배열)
```

## 필드 유효성 검사 규칙

### 필수 필드
- `username`, `password`, `name`: 신규 사용자 생성 시 필수
- `employeeId`: 시스템에서 자동 생성 (입사일 기준)

### 비밀번호 규칙
- 최소 1자 이상, 최대 25자 이하
- 특별한 문자 제한 없음

### 사용자명 규칙
- 2-30자 길이
- 영문, 숫자, 한글, 언더스코어(_), 하이픈(-) 허용

### 전화번호 형식
- 선택적 입력
- 형식: `010-1234-5678` 또는 `01012345678`

## 주의사항

1. **employeeId**: 사용자가 입력하지 않음. 입사일(hireDate) 기준으로 시스템에서 자동 생성 (형식: YYYY0001, YYYY0002...)
2. **managerId**: 조직도 구성의 핵심 필드로, 휴가 승인 및 권한 관리에 사용
3. **email 필드**: 이전 버전에서 제거됨 (UI에서 입력받지 않음)
4. **role 값**: 시스템에서 정의된 역할만 사용 가능
5. **visibleTeams**: 사용자가 접근할 수 있는 부서/팀 범위 제한용