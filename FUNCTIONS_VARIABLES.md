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
- `cn(...inputs)` - Tailwind 클래스 병합 헬퍼 (frontend/src/utils/cn.ts)
- `theme` - 공통 색상 및 간격 설정 객체 (frontend/src/utils/theme.ts)

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

**최종 업데이트**: 2025-07-17
**담당자**: HR 시스템 개발팀