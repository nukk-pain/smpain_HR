# JWT 토큰 기반 인증 전환 계획

## 현재 상태
- **문제**: 세션 기반 인증이 크로스 도메인 쿠키 문제로 작동하지 않음
- **원인**: Vercel (프론트엔드)와 Cloud Run (백엔드)가 다른 도메인
- **증상**: 로그인은 성공하지만 쿠키가 저장되지 않아 인증 상태 유지 불가

## 목표
세션 기반 인증을 JWT 토큰 기반으로 전환하여 크로스 도메인 문제 해결

## 구현 계획

### Phase 1: 백엔드 JWT 구현 (예상 시간: 1시간)

#### 1.1 필요한 패키지 설치
```bash
cd backend
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

#### 1.2 JWT 유틸리티 생성
- `backend/utils/jwt.js` 파일 생성
- 토큰 생성 함수: `generateToken(user)`
- 토큰 검증 함수: `verifyToken(token)`
- 토큰 만료 시간: 24시간

#### 1.3 로그인 엔드포인트 수정
- `/api/auth/login`에서 세션 대신 JWT 토큰 반환
- 응답 형식:
  ```json
  {
    "success": true,
    "token": "jwt.token.here",
    "user": { ... }
  }
  ```

#### 1.4 인증 미들웨어 수정
- 기존 `requireAuth` 미들웨어를 JWT 검증으로 변경
- `Authorization: Bearer <token>` 헤더에서 토큰 추출
- 토큰 검증 후 `req.user`에 사용자 정보 저장

#### 1.5 기타 엔드포인트 수정
- `/api/auth/me`: JWT 토큰 기반으로 사용자 정보 반환
- `/api/auth/logout`: 클라이언트 측에서 토큰 삭제 (서버 작업 불필요)

### Phase 2: 프론트엔드 토큰 관리 (예상 시간: 1시간)

#### 2.1 토큰 저장소 구현
- `frontend/src/utils/tokenManager.ts` 생성
- localStorage에 토큰 저장/조회/삭제
- 토큰 만료 확인 로직

#### 2.2 API 서비스 수정
- `frontend/src/services/api.ts` 수정
- axios interceptor에서 모든 요청에 Authorization 헤더 추가
- 401 응답 시 토큰 삭제 및 로그인 페이지로 리다이렉트

#### 2.3 AuthProvider 수정
- 로그인 시 토큰 저장
- 페이지 로드 시 토큰 확인
- 로그아웃 시 토큰 삭제

### Phase 3: 테스트 및 정리 (예상 시간: 30분)

#### 3.1 기능 테스트
- 로그인/로그아웃 테스트
- 페이지 새로고침 후 인증 상태 유지
- API 호출 시 인증 확인
- 토큰 만료 처리

#### 3.2 세션 관련 코드 정리
- MongoDB 세션 스토어 제거
- express-session 미들웨어 제거
- 불필요한 세션 관련 코드 정리

### Phase 4: 보안 강화 (선택 사항)

#### 4.1 Refresh Token 구현
- Access Token (15분) + Refresh Token (7일)
- 토큰 갱신 엔드포인트 추가

#### 4.2 토큰 블랙리스트
- 로그아웃한 토큰 무효화
- Redis 캐시 활용

## 기술 스택
- **백엔드**: jsonwebtoken 라이브러리
- **프론트엔드**: localStorage (또는 sessionStorage)
- **보안**: HTTPS 필수, httpOnly 쿠키 대신 Authorization 헤더 사용

## 장점
1. **크로스 도메인 문제 해결**: 쿠키에 의존하지 않음
2. **확장성**: 서버 측 세션 저장소 불필요
3. **모바일 지원**: 동일한 인증 방식 사용 가능
4. **마이크로서비스 친화적**: 상태 비저장 아키텍처

## 주의사항
1. **XSS 취약점**: localStorage는 JavaScript로 접근 가능하므로 XSS 공격에 주의
2. **토큰 탈취**: HTTPS 필수, 토큰 만료 시간 적절히 설정
3. **로그아웃**: 서버 측에서 토큰을 무효화할 수 없음 (블랙리스트 구현 필요)

## 롤백 계획
1. Git 이전 커밋으로 복원
2. 세션 기반 인증 코드 백업
3. 환경변수만 변경하여 전환 가능하도록 구현

## 예상 총 소요 시간
- 구현: 2.5시간
- 테스트: 30분
- 배포: 30분
- **총 3시간**