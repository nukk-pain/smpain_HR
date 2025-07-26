# HR 시스템 API 엔드포인트 정리

## 개요
이 파일은 HR 시스템의 모든 API 엔드포인트를 정리하여 중복 개발을 방지하고 API 사용성을 높이기 위한 문서입니다.

**Base URL**: `http://localhost:5455/api`

---

## /api/auth (인증 관리)

### POST 엔드포인트
#### POST `/api/auth/login`
- **기능**: 사용자 로그인
- **권한**: 없음 (public)
- **Body**: 
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **응답**: 
  ```json
  {
    "success": true,
    "message": "Login successful",
    "user": { /* 사용자 정보 */ }
  }
  ```

#### POST `/api/auth/logout`
- **기능**: 사용자 로그아웃
- **권한**: 없음
- **응답**: 
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

#### POST `/api/auth/clear-session`
- **기능**: 세션 초기화 (개발 환경 전용)
- **권한**: 없음
- **응답**: 
  ```json
  {
    "success": true,
    "message": "Session cleared"
  }
  ```

#### POST `/api/auth/change-password`
- **기능**: 비밀번호 변경
- **권한**: 로그인 필요
- **Body**: 
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```

### GET 엔드포인트
#### GET `/api/auth/me`
- **기능**: 현재 사용자 정보 조회
- **권한**: 없음 (세션 확인)
- **응답**: 
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "string",
      "username": "string",
      "name": "string",
      "role": "string",
      "permissions": ["string"]
    }
  }
  ```

---

## /api/users (사용자 관리)

### GET 엔드포인트
#### GET `/api/users`
- **기능**: 모든 사용자 조회
- **권한**: `users:view`
- **응답**: 사용자 목록 배열

#### GET `/api/users/:id`
- **기능**: 특정 사용자 조회
- **권한**: `users:view`
- **파라미터**: `id` (사용자 ID)
- **응답**: 사용자 상세 정보

#### GET `/api/users/:id/permissions`
- **기능**: 사용자 권한 조회
- **권한**: `admin:permissions`
- **파라미터**: `id` (사용자 ID)

#### GET `/api/users/stats/overview`
- **기능**: 사용자 통계 조회
- **권한**: 로그인 필요
- **응답**: 사용자 통계 정보

#### GET `/api/users/debug/permissions`
- **기능**: 권한 디버깅 정보
- **권한**: 로그인 필요
- **응답**: 권한 디버깅 데이터

### POST 엔드포인트
#### POST `/api/users`
- **기능**: 새 사용자 생성
- **권한**: `users:create`
- **Body**: 
  ```json
  {
    "username": "string",
    "name": "string",
    "password": "string",
    "role": "string",
    "department": "string",
    "position": "string",
    "hireDate": "YYYY-MM-DD",
    "birthDate": "YYYY-MM-DD",
    "phoneNumber": "string"
  }
  ```

#### POST `/api/users/debug/fix-admin`
- **기능**: 관리자 권한 수정 (디버그용)
- **권한**: 없음

#### POST `/api/users/debug/login-admin`
- **기능**: 응급 관리자 로그인 (디버그용)
- **권한**: 없음

#### POST `/api/users/debug/fix-employee-ids`
- **기능**: 잘못된 직원 ID 수정 (디버그용)
- **권한**: 없음

### PUT 엔드포인트
#### PUT `/api/users/profile/:id`
- **기능**: 사용자 프로필 수정 (개인 정보만)
- **권한**: 본인만 수정 가능
- **Body**: 
  ```json
  {
    "name": "string",
    "birthDate": "YYYY-MM-DD",
    "phoneNumber": "string"
  }
  ```

#### PUT `/api/users/:id`
- **기능**: 사용자 정보 수정
- **권한**: `users:edit`
- **Body**: 사용자 정보 (전체)

#### PUT `/api/users/:id/permissions`
- **기능**: 사용자 권한 수정
- **권한**: `admin:permissions`
- **Body**: 
  ```json
  {
    "permissions": ["string"]
  }
  ```

### DELETE 엔드포인트
#### DELETE `/api/users/:id`
- **기능**: 사용자 삭제
- **권한**: `users:delete`
- **파라미터**: `id` (사용자 ID)

---

## /api/leave (휴가 관리)

### GET 엔드포인트
#### GET `/api/leave`
- **기능**: 휴가 신청 목록 조회
- **권한**: 로그인 필요
- **Query**: `status`, `userId`, `startDate`, `endDate`
- **응답**: 휴가 신청 목록

#### GET `/api/leave/:id`
- **기능**: 특정 휴가 신청 조회
- **권한**: 로그인 필요
- **파라미터**: `id` (휴가 신청 ID)

#### GET `/api/leave/pending`
- **기능**: 대기 중인 휴가 신청 조회
- **권한**: `leave:manage`
- **응답**: 대기 중인 휴가 신청 목록

#### GET `/api/leave/balance`
- **기능**: 휴가 잔여 일수 조회
- **권한**: 로그인 필요
- **응답**: 
  ```json
  {
    "totalEntitlement": 15,
    "usedDays": 5,
    "remainingDays": 10,
    "carryOverDays": 2
  }
  ```

#### GET `/api/leave/calendar/:month`
- **기능**: 개인 달력 조회 (모든 직원 연차 표시)
- **권한**: 로그인 필요
- **파라미터**: `month` (YYYY-MM)
- **응답**: 해당 월의 모든 휴가 정보

#### GET `/api/leave/team-calendar/:month`
- **기능**: 팀 달력 조회
- **권한**: 로그인 필요
- **파라미터**: `month` (YYYY-MM)
- **Query**: `department`
- **응답**: 팀 휴가 정보

#### GET `/api/leave/team-status`
- **기능**: 팀 휴가 현황 조회
- **권한**: 로그인 필요
- **응답**: 팀 휴가 통계

#### GET `/api/leave/exceptions`
- **기능**: 휴가 예외 설정 조회
- **권한**: `leave:manage`
- **응답**: 휴가 예외 설정 목록

#### GET `/api/leave/cancellations/pending`
- **기능**: 대기 중인 휴가 취소 신청 조회
- **권한**: `leave:manage`
- **응답**: 대기 중인 취소 신청 목록

#### GET `/api/leave/cancellations/history`
- **기능**: 휴가 취소 이력 조회
- **권한**: 로그인 필요
- **응답**: 취소 이력 목록

#### GET `/api/leave/employee/:employeeId/log`
- **기능**: 특정 직원 휴가 로그 조회
- **권한**: `leave:manage`
- **파라미터**: `employeeId` (직원 ID)
- **응답**: 직원 휴가 로그

### POST 엔드포인트
#### POST `/api/leave`
- **기능**: 휴가 신청 생성
- **권한**: 로그인 필요
- **Body**: 
  ```json
  {
    "leaveType": "annual|sick|personal",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "reason": "string"
  }
  ```

#### POST `/api/leave/exceptions`
- **기능**: 휴가 예외 설정 생성
- **권한**: `leave:manage`
- **Body**: 
  ```json
  {
    "date": "YYYY-MM-DD",
    "maxConcurrentLeaves": 5,
    "reason": "string"
  }
  ```

#### POST `/api/leave/:id/approve`
- **기능**: 휴가 승인/거부
- **권한**: `leave:manage`
- **파라미터**: `id` (휴가 신청 ID)
- **Body**: 
  ```json
  {
    "action": "approve|reject",
    "comment": "string"
  }
  ```

#### POST `/api/leave/:id/cancel`
- **기능**: 휴가 취소 신청
- **권한**: 로그인 필요
- **파라미터**: `id` (휴가 신청 ID)
- **Body**: 
  ```json
  {
    "reason": "string"
  }
  ```

#### POST `/api/leave/:id/cancel/approve`
- **기능**: 휴가 취소 승인/거부
- **권한**: `leave:manage`
- **파라미터**: `id` (휴가 신청 ID)
- **Body**: 
  ```json
  {
    "action": "approve|reject",
    "comment": "string"
  }
  ```

#### POST `/api/leave/carry-over/:year`
- **기능**: 연말 연차 이월 처리
- **권한**: 로그인 필요
- **파라미터**: `year` (연도)

### PUT 엔드포인트
#### PUT `/api/leave/:id`
- **기능**: 휴가 신청 수정
- **권한**: 로그인 필요 (본인만)
- **파라미터**: `id` (휴가 신청 ID)
- **Body**: 휴가 신청 정보

#### PUT `/api/leave/exceptions/:id`
- **기능**: 휴가 예외 설정 수정
- **권한**: `leave:manage`
- **파라미터**: `id` (예외 설정 ID)

### DELETE 엔드포인트
#### DELETE `/api/leave/:id`
- **기능**: 휴가 신청 삭제
- **권한**: 로그인 필요 (본인만)
- **파라미터**: `id` (휴가 신청 ID)

#### DELETE `/api/leave/exceptions/:id`
- **기능**: 휴가 예외 설정 삭제
- **권한**: `leave:manage`
- **파라미터**: `id` (예외 설정 ID)

---

## /api/admin (관리자 기능)

### GET 엔드포인트
#### GET `/api/admin/leave/overview`
- **기능**: 관리자 휴가 현황 조회
- **권한**: 관리자
- **응답**: 전체 휴가 현황 통계

#### GET `/api/admin/leave/employee/:id`
- **기능**: 직원 휴가 상세 정보 조회
- **권한**: 관리자
- **파라미터**: `id` (직원 ID)
- **응답**: 직원 휴가 상세 정보

#### GET `/api/admin/stats/system`
- **기능**: 시스템 통계 조회
- **권한**: 관리자
- **응답**: 시스템 전체 통계

#### GET `/api/admin/policy`
- **기능**: 현재 휴가 정책 조회
- **권한**: 관리자
- **응답**: 현재 활성 휴가 정책

#### GET `/api/admin/policy/history`
- **기능**: 정책 변경 이력 조회
- **권한**: 관리자
- **응답**: 정책 변경 이력 목록

#### GET `/api/admin/leave/bulk-pending`
- **기능**: 대량 승인 대기 휴가 조회
- **권한**: 관리자
- **Query**: `department`, `startDate`, `endDate`
- **응답**: 필터링된 대기 휴가 목록

### POST 엔드포인트
#### POST `/api/admin/leave/adjust`
- **기능**: 직원 휴가 잔액 조정
- **권한**: 관리자
- **Body**: 
  ```json
  {
    "userId": "string",
    "adjustmentType": "add|subtract|carry_over|cancel_usage",
    "amount": 5,
    "reason": "string"
  }
  ```

#### POST `/api/admin/leave/bulk-approve`
- **기능**: 휴가 대량 승인/거부
- **권한**: 관리자
- **Body**: 
  ```json
  {
    "leaveIds": ["string"],
    "action": "approve|reject",
    "comment": "string"
  }
  ```

### PUT 엔드포인트
#### PUT `/api/admin/policy`
- **기능**: 휴가 정책 업데이트
- **권한**: 관리자
- **Body**: 
  ```json
  {
    "advanceNoticeRequired": 3,
    "maxConsecutiveDays": 15,
    "maxPendingRequests": 1,
    "saturdayWorkingDays": 0.5,
    "sundayWorkingDays": 0
  }
  ```

---

## /api/departments (부서 관리)

### GET 엔드포인트
#### GET `/api/departments`
- **기능**: 모든 부서 조회
- **권한**: 로그인 필요
- **응답**: 부서 목록

#### GET `/api/departments/:name/employees`
- **기능**: 부서 직원 조회
- **권한**: 로그인 필요
- **파라미터**: `name` (부서명)
- **응답**: 부서 직원 목록

### POST 엔드포인트
#### POST `/api/departments`
- **기능**: 부서 생성
- **권한**: `departments:manage`
- **Body**: 
  ```json
  {
    "name": "string",
    "description": "string"
  }
  ```

### PUT 엔드포인트
#### PUT `/api/departments/:id`
- **기능**: 부서 수정
- **권한**: `departments:manage`
- **파라미터**: `id` (부서 ID)
- **Body**: 부서 정보

### DELETE 엔드포인트
#### DELETE `/api/departments/:id`
- **기능**: 부서 삭제
- **권한**: `departments:manage`
- **파라미터**: `id` (부서 ID)

---

## /api/payroll (급여 관리)

### GET 엔드포인트
#### GET `/api/payroll/monthly/:year_month`
- **기능**: 월별 급여 조회
- **권한**: 로그인 필요
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 월별 급여 데이터

#### GET `/api/payroll/employee/:userId`
- **기능**: 직원별 급여 조회
- **권한**: 로그인 필요
- **파라미터**: `userId` (직원 ID)
- **응답**: 직원 급여 이력

#### GET `/api/payroll/stats/:yearMonth`
- **기능**: 급여 통계 조회
- **권한**: `payroll:view`
- **파라미터**: `yearMonth` (YYYY-MM)
- **응답**: 급여 통계

### POST 엔드포인트
#### POST `/api/payroll/monthly`
- **기능**: 월별 급여 생성
- **권한**: `payroll:manage`
- **Body**: 
  ```json
  {
    "userId": "string",
    "yearMonth": "YYYY-MM",
    "baseSalary": 3000000,
    "incentive": 500000,
    "actualPaid": 3500000
  }
  ```

### PUT 엔드포인트
#### PUT `/api/payroll/monthly/:id`
- **기능**: 월별 급여 수정
- **권한**: `payroll:manage`
- **파라미터**: `id` (급여 ID)
- **Body**: 급여 정보

### DELETE 엔드포인트
#### DELETE `/api/payroll/monthly/:id`
- **기능**: 월별 급여 삭제
- **권한**: `payroll:manage`
- **파라미터**: `id` (급여 ID)

---

## /api/bonus (보너스 관리)

### GET 엔드포인트
#### GET `/api/bonus/:year_month`
- **기능**: 월별 보너스 조회
- **권한**: 로그인 필요
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 월별 보너스 데이터

#### GET `/api/bonus/user/:userId`
- **기능**: 사용자별 보너스 요약
- **권한**: 로그인 필요
- **파라미터**: `userId` (사용자 ID)
- **응답**: 사용자 보너스 요약

### POST 엔드포인트
#### POST `/api/bonus`
- **기능**: 보너스 생성
- **권한**: `payroll:manage`
- **Body**: 
  ```json
  {
    "userId": "string",
    "yearMonth": "YYYY-MM",
    "amount": 1000000,
    "description": "string"
  }
  ```

### PUT 엔드포인트
#### PUT `/api/bonus/:id`
- **기능**: 보너스 수정
- **권한**: `payroll:manage`
- **파라미터**: `id` (보너스 ID)
- **Body**: 보너스 정보

### DELETE 엔드포인트
#### DELETE `/api/bonus/:id`
- **기능**: 보너스 삭제
- **권한**: `payroll:manage`
- **파라미터**: `id` (보너스 ID)

---

## /api/sales (매출 관리)

### GET 엔드포인트
#### GET `/api/sales/:year_month`
- **기능**: 월별 매출 조회
- **권한**: 로그인 필요
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 월별 매출 데이터

#### GET `/api/sales/user/:userId`
- **기능**: 사용자별 매출 요약
- **권한**: 로그인 필요
- **파라미터**: `userId` (사용자 ID)
- **응답**: 사용자 매출 요약

#### GET `/api/sales/stats/:yearMonth`
- **기능**: 매출 통계 조회
- **권한**: `payroll:view`
- **파라미터**: `yearMonth` (YYYY-MM)
- **응답**: 매출 통계

### POST 엔드포인트
#### POST `/api/sales`
- **기능**: 매출 기록 생성
- **권한**: `payroll:manage`
- **Body**: 
  ```json
  {
    "userId": "string",
    "yearMonth": "YYYY-MM",
    "amount": 5000000,
    "target": 4000000
  }
  ```

### PUT 엔드포인트
#### PUT `/api/sales/:id`
- **기능**: 매출 기록 수정
- **권한**: `payroll:manage`
- **파라미터**: `id` (매출 ID)
- **Body**: 매출 정보

### DELETE 엔드포인트
#### DELETE `/api/sales/:id`
- **기능**: 매출 기록 삭제
- **권한**: `payroll:manage`
- **파라미터**: `id` (매출 ID)

---

## /api/reports (보고서 관리)

### GET 엔드포인트
#### GET `/api/reports/payroll/:year_month`
- **기능**: 급여 보고서 생성
- **권한**: `reports:view`
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 급여 보고서 데이터

#### GET `/api/reports/payroll/:year_month/excel`
- **기능**: 급여 엑셀 다운로드
- **권한**: `reports:view`
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 엑셀 파일

#### GET `/api/reports/comparison/:upload_id/:year_month/excel`
- **기능**: 비교 보고서 다운로드
- **권한**: `reports:view`
- **파라미터**: `upload_id`, `year_month`
- **응답**: 비교 보고서 엑셀 파일

#### GET `/api/reports/payslip/:userId/:year_month/excel`
- **기능**: 급여명세서 다운로드
- **권한**: 로그인 필요 (본인만)
- **파라미터**: `userId`, `year_month`
- **응답**: 급여명세서 엑셀 파일

#### GET `/api/reports/template/payroll`
- **기능**: 급여 템플릿 다운로드
- **권한**: `reports:view`
- **응답**: 급여 템플릿 엑셀 파일

#### GET `/api/reports/leave/:year_month`
- **기능**: 휴가 보고서 생성
- **권한**: `reports:view`
- **파라미터**: `year_month` (YYYY-MM)
- **응답**: 휴가 보고서 데이터

---

## /api/upload (파일 업로드)

### GET 엔드포인트
#### GET `/api/upload`
- **기능**: 업로드 이력 조회
- **권한**: `payroll:manage`
- **응답**: 업로드 이력 목록

#### GET `/api/upload/:id/preview`
- **기능**: 업로드 미리보기
- **권한**: `payroll:manage`
- **파라미터**: `id` (업로드 ID)
- **응답**: 업로드 데이터 미리보기

#### GET `/api/upload/:id/compare/:year_month`
- **기능**: 업로드 데이터 비교
- **권한**: `payroll:manage`
- **파라미터**: `id`, `year_month`
- **응답**: 비교 결과

### POST 엔드포인트
#### POST `/api/upload`
- **기능**: 급여 파일 업로드
- **권한**: `payroll:manage`
- **Body**: multipart/form-data
- **파일**: payrollFile (엑셀 파일, 최대 10MB)
- **응답**: 업로드 결과

### PUT 엔드포인트
#### PUT `/api/upload/:id/process`
- **기능**: 업로드 처리 (급여 데이터 적용)
- **권한**: `payroll:manage`
- **파라미터**: `id` (업로드 ID)
- **응답**: 처리 결과

---

## 권한 시스템

### 권한 종류
- **users:view** - 사용자 조회
- **users:create** - 사용자 생성
- **users:edit** - 사용자 수정
- **users:delete** - 사용자 삭제
- **leave:view** - 휴가 조회
- **leave:manage** - 휴가 관리
- **payroll:view** - 급여 조회
- **payroll:manage** - 급여 관리
- **reports:view** - 보고서 조회
- **departments:manage** - 부서 관리
- **admin:permissions** - 권한 관리

### 역할별 기본 권한
- **admin**: 모든 권한
- **manager**: users:view, leave:view, leave:manage, reports:view
- **user**: leave:view (본인만)

---

## 에러 응답 형태

### 공통 에러 응답
```json
{
  "success": false,
  "error": "에러 메시지",
  "details": "상세 정보 (선택사항)"
}
```

### HTTP 상태 코드
- **200**: 성공
- **201**: 생성 성공
- **400**: 잘못된 요청
- **401**: 인증 필요
- **403**: 권한 없음
- **404**: 리소스 없음
- **500**: 서버 오류

---

## 새로운 API 추가 시 체크리스트

1. **기존 API 확인**: 이 문서에서 비슷한 기능의 API가 있는지 확인
2. **RESTful 원칙**: HTTP 메소드와 URL 패턴 일관성 유지
3. **권한 체크**: 적절한 권한 확인 미들웨어 적용
4. **문서 업데이트**: 새로운 API 추가 시 이 문서에 반드시 업데이트
5. **에러 처리**: 일관된 에러 응답 형태 유지
6. **파라미터 검증**: 입력값 유효성 검사 적용

---

**최종 업데이트**: 2025-01-17
**담당자**: HR 시스템 개발팀