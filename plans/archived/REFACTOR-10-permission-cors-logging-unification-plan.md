# REFACTOR-10: 권한/CORS/로깅 일원화 계획

## 개요
- 목적: 백엔드 전역에서 중복/분산된 권한 체크, CORS 세팅, 로깅 정책을 일원화해 보안과 유지보수성을 향상.
- 범위: 서버 내부 구조 리팩토링(외부 API 스펙 변경 없음). 라우트별 권한 체크 통합, CORS 단일 소스화, 민감정보 로깅 차단 및 로그레벨 제어.

## 목표
- 권한: 모든 라우트가 `backend/middleware/permissions.js`의 미들웨어를 사용(중복 구현 제거).
- CORS: `corsOptions`만 단일 진입점으로 사용하고, `server.js`의 별도 헤더 주입은 필요 시 플래그로 제어.
- 로깅: 토큰/비밀번호/DB 자격증명 등 민감정보를 프로덕션에서 절대 로그로 남기지 않음. 로그레벨 환경변수로 제어.

## 변경 대상(파일)
- `backend/server.js`
  - 중복된 `requirePermission` 제거 → `middleware/permissions.js` 사용
  - 프로덕션 강제 CORS 헤더 블록을 환경변수(`FORCE_CORS_HEADERS`)로 가드하거나 제거하고 `corsOptions` 일원화
  - DB/토큰 관련 디버그 로그 마스킹/비활성화(프로덕션)
- `backend/routes/*`
  - `routes/payroll.js`, `routes/auth.js` 등에서 로컬 정의된 `requirePermission` 제거 → 공용 미들웨어 사용
- `backend/middleware/errorHandler.js`
  - `corsOptions` 유지(필요 시 허용 오리진만 조정). 공통 보안 헤더 유지
- `backend/utils/jwt.js`
  - 생성/검증 로그의 민감정보 출력 금지(프로덕션). 사용자명 등 최소 정보만(또는 레벨 기반 제어)
- (옵션) 공통 로거 도입
  - 외부 의존성 도입 전: `process.env.LOG_LEVEL` 기반의 간단한 래퍼 유틸 도입

## 작업 상세
1) 권한 체크 일원화
- 모든 라우트에서 `requireAuth`, `requirePermission`, `requireRole` 등 공용 미들웨어 사용
- 서버 부트 시 전역 미들웨어에서 JWT 파싱은 유지하되, 권한 판단은 각 라우트에서 공용 미들웨어로 처리
- 권한 상수/역할-권한 맵은 `permissions.js`를 단일 소스로 유지

2) CORS 단일화
- `errorHandler.js`의 `corsOptions`만 사용하도록 `server.js` 내 별도 헤더 주입 로직은 `FORCE_CORS_HEADERS`로 가드(기본 off)
- 허용 오리진은 환경변수 `ALLOWED_ORIGINS` 우선 → 그 외 기본 목록

3) 로깅 표준화/보안 강화
- 환경변수 `LOG_LEVEL=debug|info|warn|error` 도입(기본 info)
- 프로덕션에서 JWT/비밀번호/연결문자열(비밀번호 부분) 마스킹. 토큰 전문 로그 제거
- 요청 로거에 요청 ID(간단 랜덤/헤더 추출) 추가(옵션)

## 수용 기준(AC)
- 기존 모든 API 스펙/권한 결과 동일(회귀 없음)
- 라우트 파일에서 로컬 `requirePermission` 정의 제거
- CORS는 `corsOptions` 경로로만 설정되며, 프로덕션에서 이중 설정이 사라짐
- 프로덕션 로그에 토큰/비밀번호/민감정보 미노출
- 테스트 스위트 통과(권한/문서/에러로깅 관련 기존 테스트 포함)

## 테스트 계획
- 단위: `permissions` 미들웨어 동작(역할/권한/컨텍스트) 재검증
- 통합: CORS 옵션 적용 확인, 중복 헤더 미발생, 권한 거부/허용 케이스 회귀
- 스모크: 로그인→보호 라우트 접근, 로그아웃→블랙리스트 토큰 거부(옵션 플래그 on 시)

## 작업량/일정(예상)
- 구현: 0.5~1일
- 테스트/회귀 검증: 0.5일
- 합계: 1.0~1.5일

## 리스크 및 완화
- 권한 회귀: 점진적 적용 + 테스트 먼저, 라우트 단위 PR/커밋 분리
- CORS 차단: 스테이징에서 오리진 화이트리스트 재확인
- 로그 소실/부족: `LOG_LEVEL`로 조절 가능, 디버그 필요 시 일시 상향

## 완료 정의(DoD)
- 라우트 전반에서 공용 권한 미들웨어로 통일
- CORS 중복 제거 및 환경변수 기반 설정 확인
- 민감정보 로그 차단 보장, CI 녹색
