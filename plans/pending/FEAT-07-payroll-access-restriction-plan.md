# FEAT-07: 급여 기능 접근 권한 제한 계획

## 📋 개요
- **목적**: 급여 관련 모든 기능을 Admin 전용으로 제한하여 보안 강화
- **배경**: 현재 Supervisor도 일부 급여 기능 접근 가능. 민감한 급여 정보는 Admin만 접근하도록 제한 필요
- **범위**: Frontend 라우트 보호 + Backend API 권한 검증 + UI 메뉴 숨김
- **설계 원칙**: 향후 권한 변경이 쉽도록 설정 파일 기반 권한 관리 시스템 구축

## 🎯 목표
- **Admin 전용 기능**: 모든 급여 관련 페이지/API를 Admin만 접근 가능하게 제한
- **Supervisor 제한**: Supervisor 역할에서 급여 메뉴/기능 완전 차단
- **User 제한**: 일반 사용자는 기존처럼 급여 기능 미노출
- **연차 기능 유지**: 연차 관리는 기존 권한 체계 유지
- **확장성 확보**: 설정 파일 수정만으로 권한 변경 가능한 구조 구축

## 📊 역할별 기능 접근 권한 (최종 상태)

### User (일반 직원)
| 기능 | 접근 권한 | 설명 |
|------|-----------|------|
| 본인 연차 조회/신청 | ✅ | 본인 연차만 관리 |
| 본인 정보 조회/수정 | ✅ | 비밀번호, 연락처 등 |
| 대시보드 | ✅ | 제한된 정보만 표시 |
| 급여 기능 | ❌ | 모든 급여 관련 기능 차단 |
| 팀원 관리 | ❌ | - |
| 시스템 설정 | ❌ | - |

### Supervisor (관리자)
| 기능 | 접근 권한 | 설명 |
|------|-----------|------|
| 본인 연차 관리 | ✅ | User 기능 포함 |
| 팀원 연차 승인 | ✅ | 연차 승인/반려 |
| 팀원 정보 조회 | ✅ | 팀원 목록 및 기본 정보 |
| 부서 관리 | ✅ | 부서 정보 조회/수정 |
| 대시보드 | ✅ | 팀 통계 포함 |
| 급여 기능 | ❌ | 모든 급여 관련 기능 차단 |
| 시스템 설정 | ❌ | - |

### Admin (최고 관리자)
| 기능 | 접근 권한 | 설명 |
|------|-----------|------|
| 모든 연차 관리 | ✅ | 전사 연차 관리 |
| 모든 사용자 관리 | ✅ | 사용자 CRUD |
| 급여 관리 | ✅ | 급여 계산/조회/수정 |
| 급여명세서 | ✅ | 업로드/배포/관리 |
| 인센티브/보너스 | ✅ | 계산 및 관리 |
| 일용직 급여 | ✅ | 일용직 급여 관리 |
| 시스템 설정 | ✅ | 모든 설정 접근 |
| 보고서/통계 | ✅ | 전체 통계 및 보고서 |

## 📁 변경 대상 파일

### Frontend
1. **권한 설정 파일 생성** (NEW)
   - `frontend/src/config/featurePermissions.ts` - 기능별 권한 매핑
   - `frontend/src/config/routePermissions.ts` - 라우트별 권한 설정

2. **권한 체크 유틸리티** (NEW)
   - `frontend/src/utils/permissionChecker.ts` - 권한 검증 로직
   - `frontend/src/hooks/useFeatureAccess.ts` - 권한 체크 훅

3. **라우팅 보호** (`frontend/src/App.tsx`)
   - 설정 파일 기반 동적 권한 체크
   - `/payroll/*` 경로를 설정에 따라 제한

4. **메뉴 숨김** (`frontend/src/components/Layout.tsx`)
   - featurePermissions 설정 기반 메뉴 렌더링
   - 권한별 메뉴 아이템 동적 생성

5. **컴포넌트 권한 체크**
   - 모든 급여 관련 컴포넌트에 useFeatureAccess 훅 적용
   - PayrollManagement, PayrollDashboard, PayrollExcelUpload 등

### Backend
1. **권한 설정 파일 생성** (NEW)
   - `backend/config/featurePermissions.js` - 기능별 권한 매핑
   - `backend/config/apiPermissions.js` - API 엔드포인트별 권한

2. **동적 권한 미들웨어** (`backend/middleware/permissions.js`)
   - `requireFeature(feature)` - 기능 기반 권한 체크
   - `requireRole(roles)` - 역할 기반 권한 체크 (배열 지원)
   - 설정 파일에서 권한 정보 읽어 처리

3. **API 권한 적용** (`backend/routes/`)
   - 모든 라우트에서 requireFeature() 사용
   - 하드코딩된 권한 체크 제거
   - 설정 파일 기반 동적 권한 적용

## 🔄 작업 단계

### Phase 0: 권한 설정 시스템 구축 (0.5일)
1. **권한 설정 파일 생성**
   ```javascript
   // backend/config/featurePermissions.js
   module.exports = {
     features: {
       // 급여 관련 기능 (현재는 Admin만, 향후 변경 가능)
       payroll_view: ['Admin'],      // 나중에 ['Admin', 'Supervisor'] 가능
       payroll_edit: ['Admin'],
       payroll_excel: ['Admin'],
       payslip_upload: ['Admin'],
       sales_management: ['Admin'],
       bonus_management: ['Admin'],
       daily_worker: ['Admin'],
       
       // 연차 관련 기능
       leave_personal: ['User', 'Supervisor', 'Admin'],
       leave_team: ['Supervisor', 'Admin'],
       leave_all: ['Admin'],
       
       // 사용자 관리
       user_management: ['Admin'],
       department_management: ['Supervisor', 'Admin']
     }
   };
   ```

2. **동적 권한 미들웨어**
   ```javascript
   // backend/middleware/permissions.js
   const featurePermissions = require('../config/featurePermissions');
   
   const requireFeature = (feature) => {
     return (req, res, next) => {
       const allowedRoles = featurePermissions.features[feature] || [];
       if (!req.user || !allowedRoles.includes(req.user.role)) {
         return res.status(403).json({ 
           message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
         });
       }
       next();
     };
   };
   ```

### Phase 1: Backend API 권한 적용 (0.5일)
1. **API 권한 적용**
   ```javascript
   // payroll.js
   router.get('/payroll', requireFeature('payroll_view'), getPayroll);
   router.post('/payroll', requireFeature('payroll_edit'), updatePayroll);
   
   // sales.js  
   router.get('/sales', requireFeature('sales_management'), getSales);
   ```

2. **라우트별 권한 적용**
   - GET/POST/PUT/DELETE `/api/payroll/*` → requireAdmin
   - GET/POST `/api/sales/*` → requireAdmin
   - POST `/api/documents/payslip/*` → requireAdmin
   - CRUD `/api/dailyWorkers/*` → requireAdmin

3. **테스트**
   - Supervisor 계정으로 API 접근 시 403 응답 확인
   - Admin 계정으로 정상 접근 확인

### Phase 2: Frontend 권한 시스템 구축 (0.5일)
1. **권한 설정 파일**
   ```typescript
   // frontend/src/config/featurePermissions.ts
   export const FEATURE_PERMISSIONS = {
     // Backend와 동일한 구조
     payroll_view: ['Admin'],
     payroll_edit: ['Admin'],
     payslip_upload: ['Admin'],
     // 향후 변경 시 여기만 수정
   };
   ```

2. **권한 체크 훅**
   ```typescript
   // frontend/src/hooks/useFeatureAccess.ts
   export const useFeatureAccess = (feature: string) => {
     const { user } = useAuth();
     const allowedRoles = FEATURE_PERMISSIONS[feature] || [];
     return allowedRoles.includes(user?.role || '');
   };
   ```

3. **동적 라우트 보호**
   ```typescript
   // frontend/src/components/FeatureRoute.tsx
   const FeatureRoute = ({ feature, children }) => {
     const hasAccess = useFeatureAccess(feature);
     if (!hasAccess) {
       return <Navigate to="/dashboard" />;
     }
     return children;
   };
   ```

2. **라우팅 수정**
   ```typescript
   // App.tsx
   <Route path="/payroll/*" element={
     <AdminOnlyRoute>
       <PayrollRoutes />
     </AdminOnlyRoute>
   } />
   ```

3. **메뉴 조건부 렌더링**
   ```typescript
   // Layout.tsx
   {user.role === 'Admin' && (
     <MenuItem onClick={() => navigate('/payroll')}>
       급여 관리
     </MenuItem>
   )}
   ```

### Phase 3: 메뉴 및 UI 동적 렌더링 (0.3일)
1. **동적 메뉴 생성**
   ```typescript
   // Layout.tsx
   const menuItems = [
     {
       label: '급여 관리',
       path: '/payroll',
       feature: 'payroll_view',
       icon: <PaymentIcon />
     },
     // ... 다른 메뉴들
   ].filter(item => 
     !item.feature || useFeatureAccess(item.feature)
   );
   ```

### Phase 4: UI/UX 정리 (0.2일)
1. **Supervisor 대시보드 정리**
   - 급여 관련 통계 위젯 제거
   - 급여 관련 퀵링크 제거

2. **에러 메시지 개선**
   - 권한 없음 메시지 한글화
   - 적절한 리다이렉션

3. **문서 업데이트**
   - 권한 매트릭스 문서 수정
   - 사용자 가이드 업데이트

## ✅ 수용 기준 (Acceptance Criteria)
- [ ] Supervisor 계정으로 로그인 시 급여 메뉴가 보이지 않음
- [ ] Supervisor가 URL 직접 입력해도 급여 페이지 접근 불가
- [ ] Supervisor가 급여 API 호출 시 403 에러 응답
- [ ] Admin은 기존처럼 모든 급여 기능 정상 사용
- [ ] 연차 관리는 기존 권한 체계 유지
- [ ] 권한 변경사항이 문서에 반영됨

## 🧪 테스트 계획
1. **권한 테스트 매트릭스**
   | 역할 | 급여 메뉴 | 급여 페이지 | 급여 API | 연차 기능 |
   |------|----------|------------|----------|----------|
   | Admin | ✅ 표시 | ✅ 접근 가능 | ✅ 200 OK | ✅ 접근 가능 |
   | Supervisor | ❌ 숨김 | ❌ 리다이렉트 | ❌ 403 Forbidden | ✅ 접근 가능 |
   | User | ❌ 숨김 | ❌ 리다이렉트 | ❌ 403 Forbidden | ✅ 제한적 접근 |

2. **시나리오 테스트**
   - Supervisor 계정 로그인 → 대시보드 → 급여 메뉴 없음 확인
   - URL `/payroll` 직접 입력 → 대시보드로 리다이렉트
   - Postman으로 급여 API 호출 → 403 응답
   - Admin 계정으로 전환 → 모든 기능 정상 동작

## ⏱️ 예상 작업량
- **총 소요 시간**: 1.5~2일
- Phase 0 (권한 시스템): 0.5일
- Phase 1 (Backend): 0.5일
- Phase 2 (Frontend): 0.5일
- Phase 3 (메뉴): 0.3일
- Phase 4 (UI/UX): 0.2일
- 테스트 및 문서: 0.3일

## 🔄 향후 권한 변경 방법 (매우 간단!)

### 예시: Supervisor에게 급여 조회 권한 부여
1. **Backend 변경** (`backend/config/featurePermissions.js`)
   ```javascript
   payroll_view: ['Admin', 'Supervisor'],  // Supervisor 추가
   ```

2. **Frontend 변경** (`frontend/src/config/featurePermissions.ts`)
   ```typescript
   payroll_view: ['Admin', 'Supervisor'],  // Supervisor 추가
   ```

3. **서버 재시작** - 완료!
   - 코드 수정 없음
   - 미들웨어 수정 없음
   - 컴포넌트 수정 없음

### 예시: 새로운 기능 권한 추가
1. 설정 파일에 새 기능 추가
2. 해당 API/컴포넌트에서 requireFeature() 사용
3. 완료!

## ⚠️ 리스크 및 완화
1. **기존 Supervisor 워크플로우 영향**
   - 리스크: Supervisor가 급여 관련 업무를 하고 있었을 경우
   - 완화: 사전 공지 및 Admin 계정 부여 검토

2. **하드코딩된 권한 체크**
   - 리스크: 일부 컴포넌트에 하드코딩된 권한 로직
   - 완화: 전수 조사 및 중앙화된 권한 체크 사용

3. **캐시 이슈**
   - 리스크: 브라우저 캐시로 인한 메뉴 표시 문제
   - 완화: 버전 번호 업데이트 및 강제 새로고침 안내

## 📝 완료 정의 (Definition of Done)
- [ ] 권한 설정 파일 기반 시스템 구축 완료
- [ ] 모든 급여 관련 API에 동적 권한 적용
- [ ] Frontend에서 동적 권한 기반 접근 제어
- [ ] Supervisor/User 급여 접근 차단 확인
- [ ] 권한 변경 테스트 (설정 파일만 수정해서 동작 확인)
- [ ] 테스트 시나리오 100% 통과
- [ ] 권한 변경 가이드 문서 작성
- [ ] PR 리뷰 및 승인
- [ ] 프로덕션 배포 및 검증

## 🔗 관련 문서
- `docs/development/FUNCTIONS_VARIABLES.md` - 권한 관련 함수 문서
- `backend/middleware/permissions.js` - 권한 미들웨어
- `frontend/src/config/permissions.ts` - Frontend 권한 상수

## 📌 참고사항
- 이 작업은 보안 강화를 위한 것으로, 배포 전 충분한 테스트 필요
- Supervisor 사용자들에게 사전 공지 권장
- **권한 변경이 매우 쉬움**: 설정 파일 2개만 수정하면 즉시 적용
- **확장성 높음**: 새로운 기능/역할 추가 시 설정만 추가
- **유지보수 용이**: 권한 로직이 중앙화되어 관리 편함
- **롤백 간단**: 설정 파일만 되돌리면 즉시 이전 권한으로 복구