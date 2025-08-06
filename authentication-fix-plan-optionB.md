# 인증 시스템 수정 계획 - 옵션 B (TDD 방식)

## 목표
permissions.js의 requireAuth에 JWT 검증 로직을 추가하여 leave 관리 API의 401 오류를 해결한다.

## TDD 원칙 적용
- **Red**: 실패하는 테스트 먼저 실행하여 문제 확인
- **Green**: 최소한의 코드로 테스트를 통과시킴
- **Refactor**: 테스트가 통과한 후 코드 정리

---

## Phase 1: Red Phase - 문제 확인 및 테스트 실패 검증

### [✅] Step 1.1: 현재 실패 상황 확인
```bash
npm test -- --testPathPattern=leave-pending-visibility.test.js
```
**기대 결과**: 5개 테스트 실패 (401 Unauthorized)

### [ ] Step 1.2: 기존 성공 테스트 확인
```bash
npm test -- --testPathPattern=user
```
**기대 결과**: users 관련 테스트들이 정상 통과 (permissions.js 패턴이 작동함을 증명)

### [ ] Step 1.3: 문제 원인 재확인
- [ ] errorHandler.js의 requireAuth는 JWT 검증 포함
- [ ] permissions.js의 requireAuth는 req.user 존재만 확인
- [ ] leave 라우트들이 두 시스템을 혼용하여 req.user가 설정되지 않음

---

## Phase 2: Green Phase - 최소한의 수정으로 테스트 통과

### [ ] Step 2.1: permissions.js에 JWT 검증 로직 추가
**파일**: `/backend/middleware/permissions.js`

**수정 내용**:
```javascript
// 상단에 import 추가
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

// requireAuth 함수 수정
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 [permissions.js] Auth header:', authHeader ? 'Present' : 'Missing');
    
    const token = extractTokenFromHeader(authHeader);
    console.log('🔍 [permissions.js] Extracted token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.error('❌ [permissions.js] No token found');
      return unauthorizedError(res, 'Authentication required - No token provided');
    }
    
    const decoded = verifyToken(token);
    console.log('✅ [permissions.js] Token verified:', { userId: decoded.id, role: decoded.role });
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ [permissions.js] JWT Auth error:', error.message);
    return unauthorizedError(res, 'Invalid or expired token');
  }
};
```

### [ ] Step 2.2: 첫 번째 테스트 실행
```bash
npm test -- --testPathPattern=leave-pending-visibility.test.js
```
**기대 결과**: JWT 검증은 성공하지만 여전히 일부 테스트 실패 가능 (권한 부분)

### [ ] Step 2.3: leave 라우트들의 import 변경
**파일들**:
- `/backend/routes/leave/leaveApproval.js`
- `/backend/routes/leave/leaveRequests.js`
- `/backend/routes/leave/leaveBalance.js`
- `/backend/routes/leave/leaveCalendar.js`
- `/backend/routes/leave/leaveCancellation.js`
- `/backend/routes/leave/leaveExceptions.js`

**변경 내용**:
```javascript
// 변경 전:
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requirePermission } = require('./utils/leaveHelpers');

// 변경 후:
const { requireAuth, requirePermission } = require('../../middleware/permissions');
const { asyncHandler } = require('../../middleware/errorHandler');
```

### [ ] Step 2.4: 두 번째 테스트 실행
```bash
npm test -- --testPathPattern=leave-pending-visibility.test.js
```
**기대 결과**: 더 많은 테스트 통과, 하지만 권한 관련 이슈 발생 가능

### [ ] Step 2.5: 권한 매핑 확인 및 수정
permissions.js의 ROLE_PERMISSIONS에서 'leave:manage' 권한 확인:
```javascript
'Supervisor': [
  // 'leave:manage' 포함되어 있는지 확인
]
```

### [ ] Step 2.6: 최종 테스트 실행
```bash
npm test -- --testPathPattern=leave-pending-visibility.test.js
```
**기대 결과**: 모든 테스트 통과 (6개 중 6개 성공)

---

## Phase 3: 회귀 테스트 - 기존 기능 영향 확인

### [ ] Step 3.1: Users 기능 회귀 테스트
```bash
npm test -- --testPathPattern=user
```
**기대 결과**: 기존 users 관련 테스트들이 여전히 통과

### [ ] Step 3.2: 다른 Leave 테스트들 실행
```bash
npm test -- --testPathPattern=leave-balance-checking.test.js
npm test -- --testPathPattern=user-delete-confirmation.test.js
```
**기대 결과**: 기존에 통과했던 테스트들이 여전히 통과

### [ ] Step 3.3: 전체 Integration 테스트 실행
```bash
npm test tests/integration/
```
**기대 결과**: 전체적으로 테스트 통과율 향상

---

## Phase 4: Refactor Phase - 코드 정리

### [ ] Step 4.1: 중복 코드 확인
- [ ] errorHandler.js와 permissions.js의 requireAuth 중복 확인
- [ ] 필요시 주석으로 어떤 것이 사용되는지 명시

### [ ] Step 4.2: 로깅 정리
디버그용 console.log 제거 또는 개발환경에서만 출력되도록 수정:
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [permissions.js] Auth header:', authHeader ? 'Present' : 'Missing');
}
```

### [ ] Step 4.3: 에러 메시지 일관성 확인
permissions.js와 errorHandler.js의 에러 응답 형식이 일관된지 확인

### [ ] Step 4.4: 최종 테스트
```bash
npm test -- --testPathPattern=leave-pending-visibility.test.js
```
**기대 결과**: 리팩토링 후에도 모든 테스트 통과

---

## Phase 5: 문서화 및 정리

### [ ] Step 5.1: 변경사항 문서화
- [ ] 이 파일에 각 단계별 실행 결과 기록
- [ ] plan.md 파일의 해당 테스트 항목을 ✅ 완료로 표시

### [ ] Step 5.2: 코드 주석 추가
permissions.js의 requireAuth 함수에 주석 추가:
```javascript
// JWT Authentication middleware
// Extracts and verifies JWT token from Authorization header
// Sets req.user with decoded token payload for subsequent middleware
const requireAuth = (req, res, next) => {
```

### [ ] Step 5.3: README 또는 개발 문서 업데이트
인증 시스템이 permissions.js로 통합되었음을 문서에 명시

---

## 검증 체크리스트

### 기능 검증
- [ ] Supervisor가 pending leave requests를 볼 수 있음
- [ ] Admin이 모든 pending requests를 볼 수 있음
- [ ] Regular user는 접근이 거부됨 (403)
- [ ] 토큰 없이 접근하면 401 오류
- [ ] 잘못된 토큰으로 접근하면 401 오류

### 코드 품질 검증
- [ ] 모든 테스트 통과
- [ ] 코드 중복 최소화
- [ ] 에러 처리 일관성
- [ ] 로깅 적절성
- [ ] 주석 및 문서화 완료

---

## 롤백 계획

문제 발생 시 즉시 롤백할 수 있는 방법:
1. permissions.js의 requireAuth를 원래대로 복원
2. leave 라우트들의 import를 errorHandler.js 패턴으로 복원
3. git을 사용한다면 변경사항을 커밋 전에 stash 또는 reset

## 실행 시작
이 계획을 단계별로 실행하려면 "Step 1.1부터 시작"이라고 말씀해 주세요.