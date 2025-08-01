# HR 시스템 배포 문제 해결 계획

## 현재 상태
- Frontend: Vercel 배포 (https://smpain-hr.vercel.app)
- Backend: Google Cloud Run 배포 (https://hr-backend-429401177957.asia-northeast3.run.app)
- Database: MongoDB Atlas

## 발견된 문제점

### 1. 심각한 문제 (즉시 해결 필요)
1. **세션 쿠키 설정 문제**
   - 현재: `sameSite='none'`, `domain=undefined`
   - 문제: 크로스 도메인 인증 실패 가능
   - 위치: `backend/server.js:260-266`

2. **하드코딩된 API URL**
   - 현재: 구버전 백엔드 URL이 하드코딩됨
   - 위치: `frontend/src/services/api-client.ts:51`

### 2. 중간 문제
3. **favicon 404 오류**
   - 현재: index.html이 존재하지 않는 `/vite.svg` 참조
   - 위치: `frontend/index.html:5`

4. **구 도메인 참조**
   - 여러 파일에 `smpain.synology.me` 도메인 잔존
   - 유지보수 혼란 야기

### 3. 성능 최적화 (이미 일부 완료)
5. **번들 크기 최적화**
   - 현재: 일부 최적화 완료
   - 추가 개선 가능

## 해결 순서 및 작업 계획

### Phase 1: 긴급 수정 (인증 문제 해결)
**목표**: 로그인 후 세션 유지 문제 해결

1. **세션 쿠키 도메인 설정 수정**
   ```javascript
   // backend/server.js
   cookie: {
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     maxAge: SESSION_MAX_AGE,
     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
     domain: process.env.COOKIE_DOMAIN || undefined // 환경변수로 관리
   }
   ```

2. **환경변수 추가**
   - `.env.cloudrun`에 `COOKIE_DOMAIN` 추가 검토
   - 현재는 undefined로 두는 것이 더 안전할 수 있음

### Phase 2: API 연결 안정화
**목표**: 프론트엔드-백엔드 연결 신뢰성 향상

3. **하드코딩된 API URL 제거**
   ```typescript
   // frontend/src/services/api-client.ts
   // 구버전 URL 제거하고 환경변수만 사용
   ```

4. **API URL 설정 로직 개선**
   - 폴백 URL 제거
   - 환경변수 검증 강화

### Phase 3: 사용자 경험 개선
**목표**: 404 오류 및 UI 문제 해결

5. **Favicon 문제 해결**
   - Option 1: 간단한 favicon.ico 생성
   - Option 2: favicon 참조 완전 제거

6. **Vercel 라우팅 검증**
   - 이미 수정됨, 배포 후 테스트 필요

### Phase 4: 코드 정리
**목표**: 기술 부채 감소

7. **구 도메인 참조 정리**
   - 전체 코드베이스에서 `smpain.synology.me` 검색 및 제거
   - 환경변수로 대체

8. **불필요한 console.log 제거**
   - 프로덕션 빌드에서 console 문 제거 설정 활성화

### Phase 5: 모니터링 및 검증
**목표**: 배포 후 안정성 확인

9. **배포 후 테스트 체크리스트**
   - [ ] 로그인 기능 정상 작동
   - [ ] 세션 유지 (페이지 새로고침 후)
   - [ ] API 호출 정상 작동
   - [ ] 파일 업로드/다운로드
   - [ ] 모든 페이지 라우팅

10. **모니터링 설정**
    - Cloud Run 로그 확인
    - Vercel Analytics 확인

## 예상 소요 시간
- Phase 1-2: 30분 (긴급)
- Phase 3-4: 1시간
- Phase 5: 지속적 모니터링

## 성공 지표
1. 로그인 후 세션 유지됨
2. 404 오류 없음
3. 모든 API 호출 성공
4. 페이지 로딩 시간 < 3초

## 위험 요소
1. 세션 쿠키 설정 변경 시 기존 사용자 로그아웃 가능
2. CORS 설정 변경 시 일시적 연결 불가 가능
3. 캐시로 인한 구버전 자산 로딩

## 롤백 계획
1. Git 이전 커밋으로 복원
2. Cloud Run 이전 리비전으로 롤백
3. Vercel 이전 배포로 롤백