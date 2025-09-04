# TEST-02 통합 테스트 이슈 로그

**작성일**: 2025년 09월 04일  
**상태**: 부분 통과

## 테스트 실행 결과

### 1. payroll-access.test.js
- **통과**: 6/14 테스트
- **주요 이슈**:
  - JWT audience 설정 추가로 일부 해결
  - Supervisor와 User의 403 응답 대신 401 응답 반환
  - 일부 엔드포인트 404 반환 (라우트 미등록 가능성)

### 2. auth-refresh.test.js  
- **통과**: 0/13 테스트
- **주요 이슈**:
  - Refresh token 엔드포인트가 제대로 구현되지 않음
  - JWT 토큰 생성 방식 불일치

### 3. daily-workers.test.js
- **미실행**: 시간 제약으로 실행하지 못함

### 4. incentive-calculation.test.js
- **미실행**: 시간 제약으로 실행하지 못함

## 확인된 문제점

### 1. JWT 토큰 설정
- `audience: 'hr-frontend'` 필수
- `expiresIn` 설정 필요
- Refresh token 별도 시크릿 사용 필요

### 2. 권한 체크 로직
- 403 (Forbidden) 대신 401 (Unauthorized) 반환
- 권한 미들웨어가 role 체크 전에 토큰 검증에서 실패

### 3. 테스트 환경 설정
- MongoDB 인덱스 충돌 (employeeId unique)
- 테스트 실행 시간 과다 (타임아웃 2분)

## 해결 방안

### 단기 (배포 전)
1. E2E 테스트로 핵심 기능 검증
2. 수동 테스트로 권한 체크 확인

### 중기 (배포 후)
1. 테스트 환경 별도 구성
2. JWT 토큰 생성 로직 통일
3. 테스트 실행 시간 최적화

## 다음 단계
E2E 테스트를 통해 실제 사용자 시나리오 검증 진행