# 인증 시스템 문제 분석 및 해결 방법

## 🚨 발견된 문제

**중대한 인증 시스템 장애**: 휴가 관리 시스템의 모든 승인 관련 API가 401 Unauthorized 오류 반환

### 문제 증상
- 관리자/팀장이 대기 중인 휴가 신청을 볼 수 없음 (GET /api/leave/pending → 401)
- 휴가 승인/거부 기능 사용 불가
- JWT 토큰이 올바르게 생성되지만 검증 단계에서 실패
- 5/6 테스트가 401 오류로 실패

## 🔍 코드 분석: 현재 인증 시스템 구조

### 1. 발견된 3개의 서로 다른 인증 시스템

#### A. errorHandler.js의 requireAuth (JWT 기반)
```javascript
// 파일: /backend/middleware/errorHandler.js
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyToken(token);
    req.user = decoded; // JWT 페이로드를 req.user에 설정
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

#### B. permissions.js의 requireAuth (다른 구현)
```javascript
// 파일: /backend/middleware/permissions.js
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return unauthorizedError(res, 'Authentication required');
  }
  next();
};
```

#### C. leaveHelpers.js의 requirePermission (권한 체크)
```javascript
// 파일: /backend/routes/leave/utils/leaveHelpers.js
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // 권한 체크 로직...
  };
};
```

### 2. 현재 휴가 관리 라우트의 인증 구조

```javascript
// 파일: /backend/routes/leave/leaveApproval.js
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requirePermission } = require('./utils/leaveHelpers');

// 문제가 되는 라우트
router.get('/', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  // 대기 중인 휴가 신청 조회 로직
}));
```

## 🎯 문제의 원인 발견!

**기존 작동하던 인증 시스템을 찾았습니다:**

### 작동하는 인증 시스템 (users.js 및 다른 모든 라우트)
```javascript
// 파일: /backend/routes/users.js, departments.js, payroll.js 등
const { requireAuth, requirePermission, requireAdmin } = require('../middleware/permissions');

// 이 방식으로 사용하면 정상 작동:
router.get('/', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), asyncHandler(...));
```

### 문제가 되는 인증 시스템 (leave 라우트들만)
```javascript
// 파일: /backend/routes/leave/leaveApproval.js (문제!)
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requirePermission } = require('./utils/leaveHelpers');

// 이 방식이 문제 - 서로 다른 시스템 혼용!
router.get('/', requireAuth, requirePermission('leave:manage'), asyncHandler(...));
```

**문제**: 휴가 관리 라우트만 다른 인증 시스템을 사용하고 있어서 인증이 실패합니다!

## 🔧 수정 계획 (단계별 진행)

### 단계 1: 현재 상황 분석

**문제 상황:**
- Leave 관리 API가 모두 401 Unauthorized 오류 반환
- 두 가지 다른 인증 시스템이 혼용되고 있음
- JWT 토큰은 정상 생성되지만 검증 단계에서 실패

**현재 Leave 라우트들의 패턴 (문제가 있음):**
```javascript
// backend/routes/leave/*.js 파일들
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requirePermission } = require('./utils/leaveHelpers');
```

**성공하는 다른 라우트들의 패턴:**
```javascript  
// backend/routes/users.js 등
const { requireAuth, requirePermission } = require('../middleware/permissions');
const { asyncHandler } = require('../middleware/errorHandler');
```

### 단계 2: 인증 시스템 분석 결과

#### A. errorHandler.js의 requireAuth (JWT 검증 포함)
- ✅ JWT 토큰을 헤더에서 추출
- ✅ 토큰을 검증하고 decoded 정보를 req.user에 설정
- ✅ 실제 인증 로직 수행

#### B. permissions.js의 requireAuth (req.user 존재만 확인)
- ❌ JWT 토큰 검증 없음
- ❌ req.user가 이미 설정되어 있다고 가정
- ❌ 다른 미들웨어가 먼저 JWT를 처리해야 함

#### C. leaveHelpers.js의 requirePermission
- ✅ 권한 확인 로직은 정상적
- ❌ req.user가 설정되지 않아서 항상 401 반환

### 단계 3: 해결 방안 3가지 옵션

#### 옵션 A: 모든 라우트를 errorHandler.js 패턴으로 통일 (권장)
**장점:**
- 기존 leave 라우트들의 변경 최소화
- JWT 검증 로직이 이미 완성되어 있음
- 빠른 수정 가능

**단점:**
- users.js 등 다른 라우트들도 수정해야 함
- permissions.js의 복잡한 권한 로직 활용 불가

**수정 작업:**
1. users.js의 import를 errorHandler.js 패턴으로 변경
2. permissions.js의 requirePermission을 errorHandler.js나 별도 파일로 이동
3. 모든 라우트에서 동일한 패턴 사용

#### 옵션 B: permissions.js의 requireAuth에 JWT 검증 로직 추가
**장점:**
- users.js 등 기존 작동하는 라우트들 변경 없음
- permissions.js의 고급 권한 시스템 활용 가능

**단점:**
- 두 곳에 동일한 JWT 검증 로직 존재 (중복)
- permissions.js가 더 복잡해짐

**수정 작업:**
1. permissions.js의 requireAuth에 JWT 검증 로직 추가
2. leave 라우트들의 import만 permissions.js로 변경

#### 옵션 C: JWT 검증 미들웨어를 별도로 분리
**장점:**
- 관심사의 분리 (JWT 검증 vs 권한 확인)
- 각 파일의 역할이 명확해짐
- 코드 중복 제거

**단점:**
- 가장 많은 파일 변경 필요
- 구조적 변경이 큼

**수정 작업:**
1. JWT 검증만 담당하는 새로운 미들웨어 생성
2. 모든 라우트에서 JWT 미들웨어 + 권한 미들웨어 순서로 사용
3. 기존 코드들 정리

### 단계 4: 권장 실행 계획 (옵션 A)

#### 4.1 즉시 수정 (긴급)
1. `leaveHelpers.js`의 `requirePermission`을 `errorHandler.js`로 이동
2. 모든 leave 라우트 파일의 import 유지 (변경 없음)
3. users.js의 import를 errorHandler.js 패턴으로 변경

#### 4.2 검증
1. leave-pending-visibility.test.js 테스트 실행
2. users 관련 테스트 실행
3. 전체 API 테스트

#### 4.3 정리 (추후)
1. permissions.js와 errorHandler.js의 중복 로직 정리
2. 단일 인증 시스템으로 통합
3. 테스트 코드 업데이트

### 단계 5: 구체적인 파일 수정 계획

#### 수정할 파일들:
1. `/backend/middleware/errorHandler.js` - requirePermission 함수 추가
2. `/backend/routes/users.js` - import 패턴 변경
3. `/backend/routes/departments.js` - import 패턴 확인 및 변경
4. 기타 permissions.js를 사용하는 라우트들 확인

#### 테스트할 파일들:
1. `leave-pending-visibility.test.js` - 401 오류 해결 확인
2. 기존 users 관련 테스트들 - 회귀 테스트
3. 전체 integration 테스트 실행

### 단계 6: 안전한 진행 방법

1. **백업**: 현재 상태를 git branch로 보관
2. **단계별 테스트**: 각 수정 후 즉시 테스트 실행
3. **롤백 준비**: 문제 발생시 즉시 원복 가능하도록 준비
4. **문서화**: 각 변경사항을 이 파일에 기록

이 계획을 단계별로 진행하시겠습니까?

### 단계 2: JWT 토큰 구조 검증

#### 2.1 JWT 페이로드 구조 확인
```javascript
// utils/jwt.js에서 generateToken 함수 확인
function generateToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
    visibleTeams: user.visibleTeams || []
  };
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });
}
```

#### 2.2 토큰 검증 로직 확인
```javascript
// utils/jwt.js에서 verifyToken 함수 확인
function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });
  return decoded;
}
```

### 단계 3: 인증 시스템 통합 방법

#### 방법 A: errorHandler.js 시스템으로 통합 (권장)
```javascript
// 1. 모든 라우트에서 동일한 requireAuth 사용
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requirePermission } = require('../../middleware/permissions'); // 통합된 위치로 이동

// 2. requirePermission을 permissions.js로 이동하여 일관성 확보
```

#### 방법 B: 기존 작동하던 인증 시스템 복원
```javascript
// 이전에 작동했던 라우트들의 인증 방식을 찾아서 적용
// 예: sessions 기반 인증이 있었다면 해당 방식으로 복원
```

### 단계 4: 구체적인 수정 작업

#### 4.1 긴급 수정: JWT 검증 디버깅
```javascript
// middleware/errorHandler.js 수정
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.error('❌ No Authorization header');
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = extractTokenFromHeader(authHeader);
    console.log('🔍 Token extracted:', token ? token.substring(0, 20) + '...' : 'Failed');
    
    if (!token) {
      console.error('❌ No token in header');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = verifyToken(token);
    console.log('✅ Token verified:', { id: decoded.id, role: decoded.role });
    
    if (!decoded.id || !decoded.role) {
      console.error('❌ Invalid token payload:', decoded);
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ JWT Auth error:', error.message);
    console.error('❌ Error stack:', error.stack);
    return res.status(401).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
```

#### 4.2 권한 시스템 통합
```javascript
// middleware/permissions.js에서 requirePermission 통합
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        console.error('❌ No user in request (auth middleware failed)');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { role, permissions = [] } = req.user;
      console.log('🔍 Permission check:', { permission, role, userPermissions: permissions });
      
      // Admin은 모든 권한 허용
      if (role === 'Admin' || role === 'admin') {
        console.log('✅ Admin access granted');
        return next();
      }
      
      // 명시적 권한 확인
      if (permissions.includes(permission)) {
        console.log('✅ Permission granted via explicit permissions');
        return next();
      }
      
      // 역할 기반 권한 확인
      const rolePermissions = {
        'Supervisor': ['leave:view', 'leave:manage'],
        'supervisor': ['leave:view', 'leave:manage'],
        'User': ['leave:view'],
        'user': ['leave:view']
      };
      
      const allowedPermissions = rolePermissions[role] || [];
      if (allowedPermissions.includes(permission)) {
        console.log('✅ Permission granted via role-based permissions');
        return next();
      }
      
      console.error('❌ Permission denied:', { permission, role, permissions });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: role,
        userPermissions: permissions
      });
    } catch (error) {
      console.error('❌ Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};
```

### 단계 5: 테스트 및 검증

#### 5.1 디버그 테스트 실행
```bash
# 디버그 정보와 함께 테스트 실행
npm test -- --testPathPattern=leave-pending-visibility.test.js --verbose

# 콘솔 로그에서 인증 실패 지점 확인
# 🔍, ✅, ❌ 이모지로 표시된 로그 추적
```

#### 5.2 단계별 검증
1. JWT 토큰 생성 확인
2. Authorization 헤더 전달 확인  
3. 토큰 추출 확인
4. 토큰 검증 확인
5. req.user 설정 확인
6. 권한 검사 확인

### 단계 6: 영구적 해결 방안

#### 6.1 인증 시스템 표준화
```javascript
// 1. 단일 인증 미들웨어 사용
// 2. 표준화된 권한 시스템 구축
// 3. 일관된 에러 응답 형식
// 4. 로깅 및 디버깅 시스템 구축
```

#### 6.2 코드 정리
```javascript
// 1. 중복된 requireAuth 함수들 제거
// 2. 단일 권한 시스템으로 통합
// 3. 테스트 코드에서 인증 패턴 표준화
```

## 🚀 실행 순서

1. **즉시 실행**: JWT 검증 디버깅 코드 추가
2. **단기 수정**: 작동하는 인증 시스템 찾아서 적용
3. **중기 개선**: 인증 시스템 통합 및 표준화
4. **장기 개선**: 전체 권한 시스템 재설계

## 📋 체크리스트

- [ ] JWT 토큰 생성/검증 로직 디버깅
- [ ] Authorization 헤더 전달 확인
- [ ] 기존 작동하던 인증 패턴 찾기
- [ ] 인증 미들웨어 통합
- [ ] 권한 검사 로직 수정
- [ ] 테스트 케이스 수정
- [ ] 전체 휴가 관리 워크플로우 테스트
- [ ] 프로덕션 배포 전 검증

이 문제는 **시스템 중단 수준의 심각도**이므로 즉시 해결이 필요합니다.