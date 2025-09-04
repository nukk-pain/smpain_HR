# FEAT-06 Refresh Token Verify Guide

목표: 프론트엔드의 자동 리프레시/재시도 로직과 이중 토큰 저장이 정상 동작하는지 최소 범위로 검증합니다.

## 사전 준비
- 백엔드 환경변수
  - `USE_REFRESH_TOKENS=true`
  - `REFRESH_TOKEN_SECRET=<your-refresh-secret>`
  - (선택) `ACCESS_TOKEN_EXPIRES_IN=1m` (테스트 편의상 단축)
- 프론트엔드 환경
  - `.env.development`의 `VITE_API_URL`이 백엔드 베이스 URL을 가리키는지 확인

## 자동 테스트(국소)
- 명령: `cd frontend && npm run test:refresh`
- 기대 결과:
  - `api.refresh.test.ts`: 401 → /auth/refresh → 원요청 재시도 성공, 동시 401에도 refresh 1회만 호출
  - `tokenManager.test.ts`: 이중 토큰 저장/조회 기본 케이스 통과

주의: 전 프로젝트 빌드는 기존 타입 오류로 실패할 수 있습니다. 이 스크립트는 FEAT-06 관련 파일만 대상으로 실행합니다.

## 수동 검증(브라우저)
1) 로그인
- 정상 로그인 시 LocalStorage에 `hr_access_token`, `hr_refresh_token` 저장

2) 유효기간 만료 유도
- `ACCESS_TOKEN_EXPIRES_IN=1m` 설정 또는 만료 시점까지 대기

3) 보호 API 호출
- 만료 직후(또는 조금 후) 화면에서 보호 API(대시보드/내 정보 등) 호출 발생
- 기대: 백그라운드에서 `/auth/refresh` 호출 → 새 access 토큰 반영 → 원요청 자동 재시도 → 화면 에러 없이 정상 표시

4) 로그아웃
- `/auth/logout` 호출 후 로컬 토큰 클리어, 보호 API 접근 시 로그인 화면으로 이동

## 기대 로그 (DEV)
- 요청 인터셉터: `🔑 Token added to request` (로그인/리프레시는 제외)
- 401 발생: 리스폰스 인터셉터가 단일 refresh in-flight 후 대기 요청 재시도
- refresh 실패 시: `clearAuth()` 후 `/login` 리다이렉트

## 트러블슈팅
- 401이 반복되고 refresh가 호출되지 않음
  - Authorization 헤더가 로그인/리프레시 요청에 붙지 않는지 확인
  - `VITE_API_URL`/CORS 설정 확인
- refresh 성공 후에도 원요청 실패
  - BE 응답 스키마: `{ accessToken, refreshToken }` 확인(레거시 `{ token }`도 지원)
  - 프론트 로컬스토리지에 새 access 토큰 저장 여부 확인

## 참고
- 핵심 파일
  - `frontend/src/services/api.ts`: 인터셉터/로그인 응답 처리
  - `frontend/src/utils/tokenManager.ts`: 이중 토큰 관리
- 옵션
  - `withCredentials` 제거(JWT 헤더 기반), 쿠키 인증 혼용 금지
