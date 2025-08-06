# 인증 시스템 심층 조사 보고서

## 🔍 조사 배경
- 예상: users.js는 permissions.js 패턴으로 작동해야 함
- 실제: 모든 API가 401 Unauthorized 오류 (users, leave 구분 없이)
- 의문: 실제로 작동했던 인증 시스템이 무엇인지 불분명

---

## 1. 현재 인증 시스템 구조 분석

### 1.1 발견된 인증 관련 파일들
- `/backend/middleware/errorHandler.js` - requireAuth 있음 (JWT 검증 포함)
- `/backend/middleware/permissions.js` - requireAuth 있음 (req.user 존재만 확인)
- `/backend/routes/leave/utils/leaveHelpers.js` - requirePermission 있음
- `/backend/utils/jwt.js` - JWT 생성/검증 로직 있음

### 1.2 server.js에서의 인증 사용 패턴
```javascript
// Line 44: errorHandler에서 requireAuth import
const { requireAuth } = require('./middleware/errorHandler');

// Line 324, 347, 371, 400, 426, 465: errorHandler의 requireAuth 사용
app.get('/api/permissions', requireAuth, requirePermission(...), ...)
```

### 1.3 라우트별 인증 패턴
- **server.js**: errorHandler.js의 requireAuth 사용
- **users.js**: permissions.js의 requireAuth 사용  
- **leave/*.js**: errorHandler.js의 requireAuth 사용

---

## 2. 테스트 실행 결과 분석

### 2.1 Leave 관리 테스트
```
FAIL tests/integration/leave-pending-visibility.test.js
5 failed, 1 passed - 모두 401 Unauthorized
```

### 2.2 Users 관리 테스트  
```
FAIL tests/integration/user-delete-confirmation.test.js
4 failed, 2 passed - 모두 401 Unauthorized
```

### 2.3 공통점
- JWT 토큰이 정상 생성됨 (테스트 로그에서 확인)
- Authorization 헤더 전달됨
- 하지만 모든 인증이 실패

---

## 3. 심층 조사 진행

### 조사 1: JWT 토큰 생성/검증 로직 확인
✅ **완료**
- JWT 생성/검증 로직 정상 작동 확인
- Secret 정상 로드됨: 'hr-development-secret-2025'
- Test 토큰 생성/검증 성공

### 조사 2: 테스트 실행 상세 분석
✅ **완료**
- **모든 API에서 401 Unauthorized** (예상과 다름)
- JWT 설정 로그는 출력되지만 **requireAuth 디버그 로그가 없음**
- **문제 가설**: requireAuth 미들웨어가 실행되지 않거나, 토큰이 전달되지 않음

### 조사 3: users.js 라우트 구조 분석  
✅ **완료 - 핵심 발견!**
- users.js는 `permissions.js`에서 requireAuth import
- permissions.js의 requireAuth는 JWT 검증 없이 req.user 존재만 확인
- **server.js에 전역 JWT 미들웨어 없음**
- **결론**: permissions.js의 requireAuth가 JWT 검증을 해야 함!

### 조사 4: 실제 문제 원인 확정
✅ **완료**
**문제**: permissions.js의 requireAuth가 JWT 검증을 하지 않음
- users.js → permissions.js requireAuth (JWT 검증 없음) → 401 오류
- leave/*.js → errorHandler.js requireAuth (JWT 검증 있음) → 정상이어야 하는데 왜 실패?

### 조사 5: leave 라우트 실패 원인 추가 분석
✅ **완료 - 추가 발견!**
- 첫 번째 supervisor 테스트에서 **404 Not Found** 발생 (라우트 누락?)
- 하지만 라우트 구조는 정상: `/api/leave/pending` → `leaveApprovalRouter`
- 다른 admin 테스트들은 **401 Unauthorized**

## ⚠️ 중요한 환경 정보
**모든 서버는 배포 서버입니다 (로컬 서버 아님)**
- Frontend: https://smpain-hr.vercel.app/ (Vercel)
- Backend: https://hr-backend-429401177957.asia-northeast3.run.app (Google Cloud Run)
- 테스트 시 실제 배포된 API를 대상으로 함
- 로컬 서버 테스트 불가

## 🎯 최종 결론

### 핵심 문제들:
1. **permissions.js requireAuth**: JWT 검증 없어서 users API 모두 401 
2. **errorHandler.js requireAuth**: JWT 검증 있지만 leave API에서 여전히 401/404
3. **라우트 문제**: 일부 leave 라우트에서 404 발생

### 해결 방안:
**즉시 실행 가능한 수정 (Option B 변형)**:
1. `permissions.js`의 `requireAuth`에 JWT 검증 로직 추가
2. leave 라우트들을 permissions.js 패턴으로 변경
3. 단일 인증 시스템으로 통합

### 예상 결과:
- users API: 401 → 200 (성공)
- leave API: 401/404 → 200 (성공)  
- 전체 인증 시스템 통합 완료

이제 Option B를 실행할 준비가 되었습니다.