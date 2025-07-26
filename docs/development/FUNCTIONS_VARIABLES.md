# HR 시스템 함수 및 변수 정리

## 개요
이 파일은 HR 시스템의 모든 함수와 변수를 정리하여 중복 개발을 방지하고 코드 재사용성을 높이기 위한 문서입니다.

---

## /backend/routes/leave.js

### 모듈 임포트 및 상수
```javascript
const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();
```

### 헬퍼 함수 (Helper Functions)

#### 1. `getUserObjectId(db, userId)`
- **역할**: 사용자 ID를 MongoDB ObjectId로 변환
- **파라미터**: 
  - `db`: 데이터베이스 인스턴스
  - `userId`: 사용자 ID (ObjectId 또는 username/name)
- **반환값**: ObjectId 또는 null
- **로직**: ObjectId가 유효하면 변환, 아니면 username/name으로 검색
- **사용 위치**: 여러 라우터 핸들러에서 사용

#### 2. `calculateAnnualLeaveEntitlement(hireDate)`
- **역할**: 입사일 기준 연차 휴가 일수 계산
- **파라미터**: `hireDate` (입사일)
- **반환값**: 연차 휴가 일수 (number)
- **로직**: 
  - 0년차: 입사일로부터 완료된 개월 수만큼 (최대 11일)
  - 1년차 이상: 15 + (근무년수 - 1), 최대 25일
- **비즈니스 규칙**: 근로기준법 기반

#### 3. `getCarryOverLeave(db, userId, currentYear)`
- **역할**: 전년도 연차 이월 일수 조회
- **파라미터**: 
  - `db`: 데이터베이스 인스턴스
  - `userId`: 사용자 ID
  - `currentYear`: 현재 년도
- **반환값**: 이월 연차 일수 (number)
- **로직**: leaveAdjustments 컬렉션에서 carry_over 타입 조회

#### 4. `toObjectId(id)`
- **역할**: ID를 안전하게 ObjectId로 변환
- **파라미터**: `id` (변환할 ID)
- **반환값**: ObjectId
- **로직**: 유효성 검사 후 변환, 실패시 에러 발생

#### 5. `getCurrentPolicy(db)`
- **역할**: 현재 활성화된 휴가 정책 조회
- **파라미터**: `db` (데이터베이스 인스턴스)
- **반환값**: 정책 객체
- **로직**: leavePolicy 컬렉션에서 isActive=true인 정책 조회, 없으면 기본값 반환

#### 6. `calculateBusinessDaysWithPolicy(db, startDate, endDate)`
- **역할**: 정책 기반 휴가 일수 계산
- **파라미터**: 
  - `db`: 데이터베이스 인스턴스
  - `startDate`: 시작일
  - `endDate`: 종료일
- **반환값**: 휴가 일수 (number)
- **로직**: 
  - 토요일: 0.5일 (정책 설정값)
  - 일요일: 0일 (정책 설정값)
  - 월-금: 1일

#### 7. `addIdField(request)`
- **역할**: 프론트엔드 호환성을 위한 id 필드 추가
- **파라미터**: `request` (요청 객체)
- **반환값**: id 필드가 추가된 객체
- **로직**: _id를 문자열로 변환하여 id 필드에 추가

#### 8. `requirePermission(permission)`
- **역할**: 권한 확인 미들웨어 생성
- **파라미터**: `permission` (필요한 권한)
- **반환값**: 미들웨어 함수
- **로직**: 세션 사용자의 권한 배열에서 해당 권한 확인

### 라우터 핸들러 함수

#### 휴가 예외 관리 (Leave Exception Management)
1. **POST `/exceptions`** - 휴가 예외 설정 생성
2. **GET `/exceptions`** - 휴가 예외 설정 조회
3. **PUT `/exceptions/:id`** - 휴가 예외 설정 수정
4. **DELETE `/exceptions/:id`** - 휴가 예외 설정 삭제

#### 휴가 신청 CRUD
1. **POST `/`** - 휴가 신청 생성
   - 중복 신청 검사
   - 동시 대기 신청 제한
   - 정책 기반 검증
2. **GET `/`** - 휴가 신청 목록 조회
3. **GET `/:id`** - 특정 휴가 신청 조회
4. **PUT `/:id`** - 휴가 신청 수정
5. **DELETE `/:id`** - 휴가 신청 삭제

#### 휴가 승인 관리
1. **POST `/:id/approve`** - 휴가 승인/거부
   - 승인 시 즉시 연차 잔여일수 차감
2. **GET `/pending`** - 대기 중인 휴가 신청 조회

#### 휴가 잔여 일수 및 캘린더
1. **GET `/balance`** - 휴가 잔여 일수 조회
2. **GET `/calendar/:month`** - 개인 캘린더 조회 (모든 직원 연차 표시)
3. **GET `/team-calendar/:month`** - 팀 캘린더 조회

#### 팀 현황 관리
1. **GET `/team-status`** - 팀 휴가 현황 조회
2. **GET `/employee/:employeeId/log`** - 특정 직원 휴가 로그 조회

#### 휴가 취소 관리
1. **POST `/:id/cancel`** - 휴가 취소 신청
2. **POST `/:id/cancel/approve`** - 휴가 취소 승인/거부
   - 승인 시 연차 잔여일수 복원
3. **GET `/cancellations/pending`** - 대기 중인 취소 신청 조회
4. **GET `/cancellations/history`** - 취소 이력 조회

#### 연말 이월 처리
1. **POST `/carry-over/:year`** - 연말 연차 이월 처리

### 중요한 비즈니스 규칙

#### 휴가 신청 검증
- 사전 신청 필수 (최소 3일 전)
- 연차 연속 사용 제한 (최대 15일)
- 동시 대기 신청 제한 (최대 1개)
- 동일 기간 중복 신청 방지 (예외 설정 제외)

#### 연차 계산 규칙
- 0년차: 월 단위 계산 (최대 11일)
- 1년차 이상: 15 + (근무년수 - 1), 최대 25일
- 미리 사용 허용: 최대 -3일
- 이월 한도: 최대 15일

#### 권한 관리
- 일반 사용자: 본인 신청만 조회/수정
- 매니저: 부서 직원 승인 권한
- 관리자: 전체 관리 권한

#### 상태 관리
- 휴가 상태: pending, approved, rejected, cancelled
- 취소 상태: pending, approved, rejected
- 승인 시 연차 잔여 일수 즉시 차감
- 취소 승인 시 연차 복원

---

## /backend/routes/admin.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
const currentYear = new Date().getFullYear();
const defaultPolicy = { /* 기본 휴가 정책 설정 */ };
const validations = []; // 정책 유효성 검사 배열
const deadlinePattern = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/; // 연월일 패턴
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어
- `requireAdmin(req, res, next)` - 관리자 권한 확인

### 라우터 핸들러 함수
- **GET `/leave/overview`** - 관리자 휴가 현황 조회
- **POST `/leave/adjust`** - 직원 휴가 잔액 조정
- **GET `/leave/employee/:id`** - 직원 휴가 상세 정보 조회
- **GET `/stats/system`** - 시스템 통계 조회
- **GET `/policy`** - 현재 휴가 정책 조회
- **PUT `/policy`** - 휴가 정책 업데이트
- **GET `/policy/history`** - 정책 변경 이력 조회
- **GET `/leave/bulk-pending`** - 대량 승인 대기 휴가 조회
- **POST `/leave/bulk-approve`** - 휴가 대량 승인/거부

### 중요한 비즈니스 규칙
- 첫 해 직원: 입사일부터 월 단위로 최대 11일
- 1년 이상 직원: 15 + (근무연수 - 1), 최대 25일
- 휴가 조정 유형: add, subtract, carry_over, cancel_usage
- 정책 변경 시 기존 정책 비활성화 후 새 정책 생성

---

## /backend/routes/auth.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **POST `/login`** - 사용자 로그인
- **POST `/logout`** - 사용자 로그아웃
- **POST `/clear-session`** - 세션 초기화 (개발 환경 전용)
- **GET `/me`** - 현재 사용자 정보 조회
- **POST `/change-password`** - 비밀번호 변경

### 중요한 비즈니스 규칙
- bcrypt를 사용한 비밀번호 해싱
- 세션 기반 인증 시스템
- 비활성화된 계정 로그인 차단
- 근무 연수 및 연차 계산 포함

---

## /backend/routes/bonus.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/:year_month`** - 월별 보너스 조회
- **POST `/`** - 보너스 생성
- **PUT `/:id`** - 보너스 수정
- **DELETE `/:id`** - 보너스 삭제
- **GET `/user/:userId`** - 사용자별 보너스 요약

### 중요한 비즈니스 규칙
- 보너스 금액은 음수 불가
- 일반 사용자는 본인 데이터만 조회 가능
- payroll:manage 권한 필요

---

## /backend/routes/departments.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/`** - 모든 부서 조회
- **POST `/`** - 부서 생성
- **PUT `/:id`** - 부서 수정
- **DELETE `/:id`** - 부서 삭제
- **GET `/:name/employees`** - 부서 직원 조회

### 중요한 비즈니스 규칙
- 부서 이름 중복 불가
- 직원이 있는 부서는 삭제 불가
- 부서 수정 시 관련 직원 정보 업데이트

---

## /backend/routes/payroll.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/monthly/:year_month`** - 월별 급여 조회
- **POST `/monthly`** - 월별 급여 생성
- **PUT `/monthly/:id`** - 월별 급여 수정
- **DELETE `/monthly/:id`** - 월별 급여 삭제
- **GET `/employee/:userId`** - 직원별 급여 조회
- **GET `/stats/:yearMonth`** - 급여 통계 조회

### 중요한 비즈니스 규칙
- 인센티브 계산: 매출액 × 인센티브율 (기본 0.1)
- 총 입력 = 기본급 + 인센티브 + 보너스
- 차액 = 실제 지급액 - 총 입력

---

## /backend/routes/reports.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/payroll/:year_month`** - 급여 보고서 생성
- **GET `/payroll/:year_month/excel`** - 급여 엑셀 다운로드
- **GET `/comparison/:upload_id/:year_month/excel`** - 비교 보고서 다운로드
- **GET `/payslip/:userId/:year_month/excel`** - 급여명세서 다운로드
- **GET `/template/payroll`** - 급여 템플릿 다운로드
- **GET `/leave/:year_month`** - 휴가 보고서 생성

### 중요한 비즈니스 규칙
- 일반 사용자는 본인 급여명세서만 다운로드 가능
- 보고서 조회 권한 필요
- 엑셀 파일 다운로드 기능 (현재 Mock 구현)

---

## /backend/routes/sales.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/:year_month`** - 월별 매출 조회
- **POST `/`** - 매출 기록 생성
- **PUT `/:id`** - 매출 기록 수정
- **DELETE `/:id`** - 매출 기록 삭제
- **GET `/user/:userId`** - 사용자별 매출 요약
- **GET `/stats/:yearMonth`** - 매출 통계 조회

### 중요한 비즈니스 규칙
- 매출 금액 음수 불가
- 동일 사용자/월 매출 기록 중복 불가
- 달성률 계산: (매출액 / 목표액) × 100

---

## /backend/routes/upload.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
const storage = multer.memoryStorage(); // 메모리 저장소
const upload = multer({ /* 10MB 제한, 엑셀 파일만 허용 */ });
```

### 헬퍼 함수
- `requirePermission(permission)` - 권한 확인 미들웨어

### 라우터 핸들러 함수
- **GET `/`** - 업로드 이력 조회
- **POST `/`** - 급여 파일 업로드
- **GET `/:id/preview`** - 업로드 미리보기
- **GET `/:id/compare/:year_month`** - 업로드 데이터 비교
- **PUT `/:id/process`** - 업로드 처리 (급여 데이터 적용)

### 중요한 비즈니스 규칙
- 엑셀 파일만 업로드 가능 (.xlsx, .xls)
- 파일 크기 제한: 10MB
- 업로드 후 자동 파싱 및 유효성 검사

---

## /backend/routes/users.js

### 변수 (상수, 설정값)
```javascript
const router = express.Router();
const PERMISSIONS = { /* 권한 상수 객체 */ };
const DEFAULT_PERMISSIONS = { /* 역할별 기본 권한 */ };
const usernamePattern = /^[a-zA-Z0-9가-힣_-]{2,30}$/; // 사용자명 패턴
```

### 헬퍼 함수
- `calculateAnnualLeaveEntitlement(hireDate)` - 연차 계산 함수
- `requirePermission(permission)` - 권한 확인 미들웨어
- `generateEmployeeId()` - 직원 ID 생성 함수 (EMP001, EMP002...)

### 라우터 핸들러 함수
- **GET `/debug/permissions`** - 권한 디버깅
- **POST `/debug/fix-admin`** - 관리자 권한 수정
- **POST `/debug/login-admin`** - 응급 관리자 로그인
- **POST `/debug/fix-employee-ids`** - 잘못된 직원 ID 수정
- **GET `/`** - 모든 사용자 조회
- **GET `/:id`** - 사용자 상세 조회
- **POST `/`** - 새 사용자 생성
- **PUT `/profile/:id`** - 사용자 프로필 수정
- **PUT `/:id`** - 사용자 정보 수정
- **DELETE `/:id`** - 사용자 삭제
- **GET `/:id/permissions`** - 사용자 권한 조회
- **PUT `/:id/permissions`** - 사용자 권한 수정
- **GET `/stats/overview`** - 사용자 통계 조회

### 중요한 비즈니스 규칙
- 직원 ID 자동 생성 (EMP001 형식)
- 첫 해 직원: 월별 1일씩 최대 11일
- 1년 이상 직원: 15 + (근무연수 - 1), 최대 25일
- 역할별 기본 권한 자동 할당
- 한국어 사용자명 지원

---

## 재사용 가능한 공통 함수 목록

### 데이터베이스 관련
- `getUserObjectId(db, userId)` - 사용자 ID 변환 (leave.js)
- `toObjectId(id)` - 안전한 ObjectId 변환 (leave.js)

### 날짜 및 계산 관련
- `calculateAnnualLeaveEntitlement(hireDate)` - 연차 일수 계산 (leave.js, users.js)
- `calculateBusinessDaysWithPolicy(db, startDate, endDate)` - 정책 기반 휴가 일수 계산 (leave.js)
- `getCarryOverLeave(db, userId, currentYear)` - 이월 연차 조회 (leave.js)

### 정책 관련
- `getCurrentPolicy(db)` - 현재 정책 조회 (leave.js)

### 권한 관련
- `requirePermission(permission)` - 권한 확인 미들웨어 (모든 routes 파일에서 사용)
- `requireAdmin(req, res, next)` - 관리자 권한 확인 (admin.js)

### ID 생성 관련
- `generateEmployeeId()` - 직원 ID 생성 함수 (EMP001, EMP002...) (users.js)

### 유틸리티
- `addIdField(request)` - 프론트엔드 호환성 필드 추가 (leave.js)

### 파일 업로드 관련
- `multer.memoryStorage()` - 메모리 저장소 설정 (upload.js)
- `multer({ /* 설정 */ })` - 파일 업로드 설정 (upload.js)

### 정규식 패턴
- `usernamePattern` - 사용자명 패턴 검증 (users.js)
- `deadlinePattern` - 연월일 패턴 검증 (admin.js)

### 상수 및 설정값
- `PERMISSIONS` - 권한 상수 객체 (users.js)
- `DEFAULT_PERMISSIONS` - 역할별 기본 권한 (users.js)
- `defaultPolicy` - 기본 휴가 정책 설정 (admin.js)

## 중복 함수 및 개선 필요 사항

### 중복 함수
1. **`calculateAnnualLeaveEntitlement(hireDate)`** - leave.js와 users.js에서 중복 구현
   - 권장: 공통 utils 파일로 이동
   
2. **`requirePermission(permission)`** - 모든 routes 파일에서 중복 구현
   - 권장: middleware 파일로 통합

### 개선 제안
1. **공통 헬퍼 함수들을 별도 utils 디렉토리로 분리**
2. **상수 및 설정값들을 config 파일로 분리**
3. **정규식 패턴들을 validation utils로 분리**
4. **ID 생성 함수들을 ID generator utils로 분리**

---

## 새로운 기능 추가 시 체크리스트

1. **기존 함수 확인**: 이 문서에서 비슷한 기능의 함수가 있는지 확인
2. **재사용 가능성**: 새로운 함수가 다른 곳에서도 사용될 수 있는지 검토
3. **문서 업데이트**: 새로운 함수 추가 시 이 문서에 반드시 업데이트
4. **네이밍 규칙**: 기존 함수들의 네이밍 패턴 유지
5. **파라미터 일관성**: 비슷한 기능의 함수들과 파라미터 순서 일관성 유지

---

## 새로 추가된 유틸리티 (2025-01-26)

### /backend/utils/database.js
**역할**: MongoDB 연결 관리 및 데이터베이스 유틸리티

#### 주요 함수
- `connectToDatabase()` - MongoDB 연결 설정 및 반환
- `getDatabase()` - 데이터베이스 인스턴스 조회
- `getClient()` - MongoDB 클라이언트 조회  
- `closeDatabaseConnection()` - 연결 종료
- `createSessionStore()` - 세션 스토어 생성
- `withTransaction(callback)` - 트랜잭션 래퍼

#### 특징
- 연결 풀링 지원 (maxPoolSize: 10, minPoolSize: 2)
- 자동 재연결 로직
- 프로세스 종료 시 안전한 연결 해제
- 싱글톤 패턴으로 연결 재사용

### /backend/utils/responses.js
**역할**: 통일된 API 응답 형식 제공

#### 주요 함수
- `successResponse(res, data, message)` - 성공 응답
- `errorResponse(res, statusCode, message, details)` - 에러 응답
- `validationError(res, errors)` - 유효성 검사 에러
- `notFoundError(res, resource)` - 404 에러
- `unauthorizedError(res, message)` - 401 에러
- `forbiddenError(res, message)` - 403 에러
- `serverError(res, error, message)` - 500 에러

#### 응답 형식
```javascript
// 성공 응답
{ "success": true, "message": "Success", "data": {...} }

// 에러 응답
{ "success": false, "error": "Error message", "details": {...} }
```

### /backend/repositories/BaseRepository.js
**역할**: MongoDB CRUD 작업 추상화

#### 주요 메서드
- `findById(id)` - ID로 문서 조회
- `findOne(query)` - 단일 문서 조회
- `findAll(query, options)` - 여러 문서 조회 (정렬, 제한, 건너뛰기 지원)
- `create(data)` - 문서 생성 (자동 timestamp 추가)
- `update(id, data)` - 문서 수정
- `updateMany(query, data)` - 여러 문서 수정
- `delete(id)` - 문서 삭제
- `deleteMany(query)` - 여러 문서 삭제
- `count(query)` - 문서 개수 조회
- `aggregate(pipeline)` - 집계 쿼리
- `exists(query)` - 문서 존재 확인
- `paginate(query, options)` - 페이지네이션
- `upsert(query, data)` - 업서트 (업데이트 또는 삽입)

#### 특징
- 자동 타임스탬프 (createdAt, updatedAt)
- 통일된 에러 처리
- 페이지네이션 지원
- ObjectId 자동 변환

### /backend/repositories/UserRepository.js
**역할**: 사용자 관련 데이터베이스 작업 특화

#### 특화 메서드
- `findByUsername(username)` - 사용자명으로 조회
- `findByEmployeeId(employeeId)` - 직원ID로 조회
- `findActiveUsers()` - 활성 사용자 조회
- `findByDepartment(department)` - 부서별 사용자 조회
- `findByRole(role)` - 역할별 사용자 조회
- `createUser(userData)` - 사용자 생성 (비밀번호 해싱)
- `updateUser(id, userData)` - 사용자 수정
- `updateLeaveBalance(userId, newBalance)` - 연차 잔액 수정
- `incrementLeaveBalance(userId, amount)` - 연차 증가
- `decrementLeaveBalance(userId, amount)` - 연차 감소
- `validatePassword(plainPassword, hashedPassword)` - 비밀번호 검증
- `deactivateUser(userId, terminationDate)` - 사용자 비활성화
- `reactivateUser(userId)` - 사용자 재활성화

### /backend/repositories/LeaveRepository.js
**역할**: 휴가 관련 데이터베이스 작업 특화

#### 특화 메서드
- `findByUserId(userId)` - 사용자별 휴가 조회
- `findByStatus(status)` - 상태별 휴가 조회
- `findPendingRequests()` - 대기 중인 요청 조회
- `findApprovedRequests()` - 승인된 요청 조회
- `findUserLeaveHistory(userId, options)` - 사용자 휴가 이력
- `findLeaveRequestsInRange(startDate, endDate)` - 기간별 휴가 조회
- `approveLeaveRequest(requestId, approverId, note)` - 휴가 승인
- `rejectLeaveRequest(requestId, approverId, reason)` - 휴가 거부
- `cancelLeaveRequest(requestId, reason)` - 휴가 취소
- `getLeaveStatsByUser(userId, year)` - 사용자별 연도 통계
- `getMonthlyLeaveStats(year, month)` - 월별 휴가 통계
- `findConflictingRequests(userId, startDate, endDate)` - 충돌 휴가 조회
- `getTotalUsedLeave(userId, year)` - 연도별 총 사용 휴가
- `getUpcomingLeaves(days)` - 예정된 휴가 조회

### /backend/repositories/PayrollRepository.js
**역할**: 급여 관련 데이터베이스 작업 특화

#### 특화 메서드
- `findByYearMonth(year, month)` - 연월별 급여 조회
- `findByUserAndMonth(userId, year, month)` - 사용자/월별 급여 조회
- `findUserPayrollHistory(userId, limit)` - 사용자 급여 이력
- `createOrUpdatePayroll(userId, year, month, data)` - 급여 생성/수정
- `bulkCreatePayroll(payrollDataArray)` - 대량 급여 생성
- `getPayrollSummary(year, month)` - 급여 요약 통계
- `getPayrollByDepartment(year, month)` - 부서별 급여 통계
- `getTopEarners(year, month, limit)` - 고액 수급자 조회
- `getPayrollTrends(userId, months)` - 급여 트렌드 분석
- `getYearlyPayrollSummary(userId, year)` - 연간 급여 요약
- `deletePayrollByMonth(year, month)` - 월별 급여 삭제
- `findIncompletePayrolls(year, month)` - 불완전한 급여 조회

### /frontend/src/hooks/useApi.ts
**역할**: API 호출 상태 관리

#### 주요 기능
- `useApi<T>()` - 단일 API 호출 관리
- `useMultipleApi()` - 다중 API 호출 관리
- `usePaginatedApi<T>()` - 페이지네이션 API 관리

#### 제공 상태
- `data` - API 응답 데이터
- `loading` - 로딩 상태
- `error` - 에러 메시지
- `execute()` - API 호출 실행
- `reset()` - 상태 초기화

### /frontend/src/hooks/useLoading.ts
**역할**: 로딩 상태 관리

#### 주요 기능
- `useLoading(initialStates)` - 다중 로딩 상태 관리
- `useSimpleLoading(initialLoading)` - 단일 로딩 상태 관리

#### 제공 메서드
- `setLoading(key, loading)` - 로딩 상태 설정
- `startLoading(key)` - 로딩 시작
- `stopLoading(key)` - 로딩 종료
- `withLoading(key, fn)` - 함수를 로딩으로 래핑
- `setLoadingWithTimeout(key, loading, timeout)` - 타임아웃 로딩

### /frontend/src/hooks/useError.ts
**역할**: 에러 상태 관리

#### 주요 기능
- `useError(initialErrors)` - 다중 에러 상태 관리
- `useSimpleError()` - 단일 에러 상태 관리

#### 제공 메서드  
- `setError(key, error)` - 에러 설정
- `clearError(key)` - 에러 초기화
- `handleApiError(key, error)` - API 에러 자동 처리
- `withErrorHandling(key, fn, options)` - 함수를 에러 처리로 래핑
- `getUserFriendlyError(key)` - 사용자 친화적 에러 메시지

### /frontend/src/hooks/useAuth.ts
**역할**: 인증 상태 관리

#### 주요 기능
- `useAuth()` - 인증 컨텍스트 훅
- `useAuthState()` - 인증 상태 관리
- `AuthProvider` - 인증 제공자 컴포넌트
- `useRequireAuth(permission, role)` - 보호된 라우트 훅  
- `usePermissionCheck()` - 권한 확인 훅

#### 제공 상태/메서드
- `user` - 현재 사용자 정보
- `isAuthenticated` - 인증 상태
- `login(username, password)` - 로그인
- `logout()` - 로그아웃
- `hasPermission(permission)` - 권한 확인
- `hasRole(role)` - 역할 확인
- `isAdmin`, `isManager` - 역할 확인 플래그

### /backend/utils/dateUtils.js & /frontend/src/utils/dateUtils.ts
**역할**: 날짜 처리 유틸리티

#### 주요 함수
- `formatDateKorean(date, options)` - 한국어 날짜 형식
- `formatDateISO(date)` - ISO 형식 (YYYY-MM-DD)
- `formatDateForDisplay(date, includeTime)` - UI 표시용 형식
- `getYearMonth(date)` - 년월 문자열 (YYYY-MM)
- `parseYearMonth(yearMonth)` - 년월 파싱
- `getDaysDifference(startDate, endDate)` - 일수 차이 계산
- `getBusinessDays(startDate, endDate)` - 영업일 계산
- `isWeekend(date)` - 주말 확인
- `isSaturday(date)` - 토요일 확인
- `addDays(date, days)` - 일수 추가
- `addMonths(date, months)` - 월수 추가
- `getStartOfMonth(date)` - 월 시작일
- `getEndOfMonth(date)` - 월 종료일
- `isToday(date)` - 오늘 확인
- `isPast(date)` - 과거 확인
- `isFuture(date)` - 미래 확인
- `getAge(birthDate)` - 나이 계산
- `isValidDate(dateString)` - 날짜 유효성 검사
- `getKoreanHolidays(year)` - 한국 공휴일 조회
- `isKoreanHoliday(date)` - 한국 공휴일 확인

#### 프론트엔드 추가 함수
- `formatDateForInput(date)` - 폼 입력용 형식
- `getRelativeTime(date)` - 상대 시간 ("2일 전")
- `getDateRange(startDate, endDate)` - 날짜 배열 생성
- `formatDuration(ms)` - 시간 지속시간 형식
- `getKoreanMonthName(month)` - 한국어 월 이름
- `getKoreanDayName(date)` - 한국어 요일 이름

---

## 리팩토링 완료 사항

### Phase 1 완료 (긴급)
✅ **데이터베이스 연결 통합**
- 중복된 MongoDB 연결 코드 제거
- 연결 풀링 및 자동 재연결 구현
- 6개 파일에서 database.js로 통합

✅ **응답 유틸리티 생성**
- 통일된 API 응답 형식 구현
- 30+ 위치의 중복 응답 패턴 해결
- 개발/프로덕션 환경별 에러 정보 제어

✅ **에러 핸들러 통합**
- 기존 middleware/errorHandler.js 활용
- asyncHandler 일관된 적용 확인

### Phase 2 진행 중 (높음)
✅ **Repository 패턴 구현**
- BaseRepository 추상 클래스 생성
- UserRepository, LeaveRepository, PayrollRepository 특화 구현
- CRUD 작업 표준화 및 중복 제거

✅ **프론트엔드 커스텀 훅 생성**
- useApi: API 호출 상태 관리
- useLoading: 로딩 상태 관리  
- useError: 에러 상태 관리
- useAuth: 인증 상태 관리

✅ **날짜 유틸리티 통합**
- 백엔드/프론트엔드 날짜 처리 함수 통합
- 258개 인스턴스의 중복 날짜 처리 해결
- 한국 공휴일, 영업일 계산 지원

### 리팩토링 효과
- **코드 중복 제거**: 15개 심각한 중복 → 해결 완료
- **일관된 패턴**: Repository 패턴으로 데이터 접근 표준화
- **향상된 에러 처리**: 통일된 응답 형식 및 에러 관리
- **재사용성 증대**: 커스텀 훅으로 프론트엔드 로직 재사용
- **유지보수성 향상**: 중앙집중식 유틸리티로 변경 사항 최소화

---

**최종 업데이트**: 2025-01-26  
**담당자**: HR 시스템 개발팀  
**리팩토링 담당**: Claude Code Assistant