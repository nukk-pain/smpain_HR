# User Database Schema Documentation

## 데이터베이스 구조

- **Database**: `SM_nomu`
- **Collection**: `users`
- **포트**: 5444 (개발환경: localhost:27017, 운영환경: 192.168.0.30:27017)

## Users Collection Schema

### 기본 필드

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `_id` | ObjectId | ✅ | MongoDB 자동 생성 ID |
| `username` | String | ✅ | 로그인용 사용자명 (유니크) |
| `password` | String | ✅ | bcrypt 해시된 비밀번호 |
| `name` | String | ✅ | 실명 |
| `role` | String | ✅ | 권한 ('admin', 'manager', 'user') |
| `email` | String | ✅ | 이메일 주소 |
| `isActive` | Boolean | ✅ | 활성 상태 (기본값: true) |
| `createdAt` | Date | ✅ | 생성일시 |
| `updatedAt` | Date | ❌ | 수정일시 |

### 확장 필드 (Phase 1.5에서 추가)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `hireDate` | Date | ❌ | 입사일 |
| `department` | String | ❌ | 부서명 |
| `position` | String | ❌ | 직급/직책 |
| `employeeId` | String | ❌ | 사원번호 (유니크) |
| `phone` | String | ❌ | 연락처 |
| `accountNumber` | String | ❌ | 계좌번호 |
| `managerId` | ObjectId | ❌ | 상급자 ID (users._id 참조) |
| `contractType` | String | ❌ | 계약형태 ('regular', 'contract') |
| `terminationDate` | Date | ❌ | 퇴사일 |
| `baseSalary` | Number | ❌ | 기본급 |
| `incentiveFormula` | String | ❌ | 인센티브 계산 공식 |

## 현재 데이터베이스 데이터 (실제)

### 1. 관리자 계정
```json
{
  "_id": ObjectId("..."),
  "username": "admin",
  "password": "$2a$10$...", // bcrypt hash of "admin"
  "name": "System Administrator",
  "role": "admin",
  "email": "admin@company.com",
  "isActive": true,
  "hireDate": ISODate("2024-01-01T00:00:00.000Z"),
  "department": "IT",
  "position": "System Administrator",
  "employeeId": "ADM001",
  "phone": "010-1234-5678",
  "accountNumber": "123-456-789012",
  "managerId": null,
  "contractType": "regular",
  "terminationDate": null,
  "baseSalary": 0,
  "incentiveFormula": "",
  "createdAt": ISODate("2025-07-10T...")
}
```

### 2. 매니저 계정
```json
{
  "_id": ObjectId("..."),
  "username": "oh",
  "password": "$2a$10$...", // bcrypt hash of "password123"
  "name": "오현중",
  "role": "manager",
  "email": "oh@company.com",
  "isActive": true,
  "hireDate": ISODate("2022-01-10T00:00:00.000Z"),
  "department": "영업1팀",
  "position": "과장",
  "employeeId": "MGR001",
  "phone": "010-5555-6666",
  "accountNumber": "555-666-777888",
  "managerId": null,
  "contractType": "regular",
  "terminationDate": null,
  "baseSalary": 3500000,
  "incentiveFormula": "sales > 5000000 ? sales * 0.3 : 0",
  "createdAt": ISODate("2025-07-10T...")
}
```

### 3. 일반 직원 계정
```json
{
  "_id": ObjectId("..."),
  "username": "shin",
  "password": "$2a$10$...", // bcrypt hash of "password123"
  "name": "신홍재",
  "role": "user",
  "email": "shin@company.com",
  "isActive": true,
  "hireDate": ISODate("2023-03-15T00:00:00.000Z"),
  "department": "영업1팀",
  "position": "대리",
  "employeeId": "EMP001",
  "phone": "010-1111-2222",
  "accountNumber": "111-222-333444",
  "managerId": null,
  "contractType": "regular",
  "terminationDate": null,
  "baseSalary": 3000000,
  "incentiveFormula": "sales * 0.15",
  "createdAt": ISODate("2025-07-10T...")
}
```

### 4. 계약직 직원 계정
```json
{
  "_id": ObjectId("..."),
  "username": "kim",
  "password": "$2a$10$...", // bcrypt hash of "password123"
  "name": "김채영",
  "role": "user",
  "email": "kim@company.com",
  "isActive": true,
  "hireDate": ISODate("2023-09-01T00:00:00.000Z"),
  "department": "영업2팀",
  "position": "사원",
  "employeeId": "EMP003",
  "phone": "010-7777-8888",
  "accountNumber": "777-888-999000",
  "managerId": null,
  "contractType": "contract",
  "terminationDate": null,
  "baseSalary": 2500000,
  "incentiveFormula": "sales >= 8000000 ? 2000000 : 0",
  "createdAt": ISODate("2025-07-10T...")
}
```

## 계산 필드 (Runtime)

API에서 조회할 때 자동으로 계산되는 필드들:

```javascript
// 근속년수 계산
yearsOfService = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24 * 365.25))

// 연차 일수 계산 (기본 15일 + 근속년수마다 1일 추가, 최대 25일)
annualLeave = Math.min(15 + yearsOfService, 25)

// 포맷된 날짜
hireDateFormatted = hireDate.toLocaleDateString('ko-KR')
terminationDateFormatted = terminationDate?.toLocaleDateString('ko-KR')
```

## 관계형 데이터

### Manager-Subordinate 관계
```javascript
// 상급자 정보 조회
manager = await db.users.findOne(
  { _id: user.managerId },
  { projection: { _id: 1, name: 1, position: 1, department: 1 } }
)

// 부하직원 정보 조회
subordinates = await db.users.find(
  { managerId: user._id },
  { projection: { _id: 1, name: 1, position: 1, department: 1 } }
)
```

## 인덱스 권장사항

```javascript
// 성능 최적화를 위한 인덱스
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "employeeId": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "department": 1 })
db.users.createIndex({ "managerId": 1 })
db.users.createIndex({ "isActive": 1 })
db.users.createIndex({ "role": 1 })
```

## API 응답 예시

### GET /api/users 응답
```json
[
  {
    "_id": "66f8a1b2c3d4e5f6a7b8c9d0",
    "username": "shin",
    "name": "신홍재",
    "role": "user",
    "email": "shin@company.com",
    "isActive": true,
    "hireDate": "2023-03-15T00:00:00.000Z",
    "department": "영업1팀",
    "position": "대리",
    "employeeId": "EMP001",
    "phone": "010-1111-2222",
    "accountNumber": "111-222-333444",
    "managerId": null,
    "contractType": "regular",
    "terminationDate": null,
    "baseSalary": 3000000,
    "incentiveFormula": "sales * 0.15",
    "createdAt": "2025-07-10T...",
    "yearsOfService": 1,
    "annualLeave": 16,
    "hireDateFormatted": "2023. 3. 15.",
    "terminationDateFormatted": null
  }
]
```

## 보안 고려사항

1. **비밀번호**: bcrypt로 해시화되어 저장
2. **세션**: Express session 기반 인증
3. **권한**: 역할 기반 접근 제어 (RBAC)
4. **API 접근**: 인증된 사용자만 접근 가능
5. **민감정보**: password 필드는 API 응답에서 제외

## 관련 컬렉션

사용자와 연관된 다른 컬렉션들:

- `monthlyPayments`: 월별 급여 데이터 (userId 참조)
- `salesData`: 매출 데이터 (userId 참조)
- `bonuses`: 상여금/포상금 데이터 (userId 참조)
- `leaveRequests`: 휴가 신청 데이터 (userId 참조)
- `payrollUploads`: 급여 파일 업로드 데이터 (uploadedBy 참조)

## 기본 계정 정보

시스템 초기화 시 생성되는 기본 계정:

- **관리자**: `admin` / `admin`
- **매니저**: `oh` / `password123`
- **직원들**: `shin`, `jung`, `kim` / `password123`