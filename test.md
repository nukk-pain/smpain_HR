# JWT 전환 후 대시보드 오류 테스트 계획

## 문제 상황 ✅ 해결됨
- JWT 인증으로 전환 완료
- ~~로그인은 성공하지만 대시보드에서 많은 오류 발생 예상~~
- ~~기존 코드들이 여전히 `req.session.user` 사용~~
- **문제 원인**: 프론트엔드에서 JWT 토큰을 Authorization 헤더에 포함시키지 않음
- **해결**: API 서비스 request interceptor에 JWT 토큰 자동 첨부 기능 추가

## 수정 완료된 사항 ✅
1. ✅ **백엔드**: 모든 `req.session.user` → `req.user` 변경 완료 (19개 파일)
2. ✅ **프론트엔드**: API 서비스에 JWT 토큰 자동 첨부 기능 추가
   - Request interceptor에 `Authorization: Bearer {token}` 헤더 자동 추가
   - Response interceptor에 401 오류 시 토큰 자동 삭제 및 로그인 페이지 리다이렉트

## 테스트 목표
1. ✅ JWT 전환 후 발생하는 모든 오류 식별 - **원인 파악됨**
2. ✅ `req.session.user`를 `req.user`로 변경 필요한 파일들 찾기 - **모두 완료**
3. 🔄 대시보드 주요 기능별 테스트 진행 중
4. ✅ 체계적인 수정 계획 수립 완료

## 테스트 단계

### 1단계: 백엔드 정적 분석 ✅ 완료
#### 1.1 세션 사용 코드 전체 검색 ✅
- [x] `req.session.user` 사용하는 모든 파일 식별 (19개 파일)
- [x] 각 파일별 수정 필요한 라인 수 파악
- [x] 우선순위별 파일 분류 (핵심 API vs 부가 기능)
- [x] **모든 `req.session.user` → `req.user`로 일괄 변경 완료**

#### 1.2 주요 API 엔드포인트 분석
**사용자 관리 API (`/api/users/*`)**
- [ ] GET /api/users - 사용자 목록 조회
- [ ] POST /api/users - 사용자 생성  
- [ ] PUT /api/users/:id - 사용자 수정
- [ ] DELETE /api/users/:id - 사용자 삭제

**휴가 관리 API (`/api/leave/*`)**
- [ ] GET /api/leave/requests - 휴가 신청 목록
- [ ] POST /api/leave/requests - 휴가 신청 생성
- [ ] PUT /api/leave/requests/:id - 휴가 신청 수정
- [ ] POST /api/leave/approve/:id - 휴가 승인

**급여 관리 API (`/api/payroll/*`)**
- [ ] GET /api/payroll - 급여 목록
- [ ] POST /api/payroll - 급여 생성
- [ ] PUT /api/payroll/:id - 급여 수정

**보고서 API (`/api/reports/*`)**
- [ ] GET /api/reports/* - 각종 보고서 생성

**관리자 API (`/api/admin/*`)**
- [ ] 관리자 전용 기능들

### 2단계: 프론트엔드 동적 테스트 🔄 진행 예정
#### 2.1 로그인 후 대시보드 접근
- [ ] 로그인 성공 여부 확인
- [ ] JWT 토큰 저장 확인 (localStorage)
- [ ] 대시보드 렌더링 확인

#### 2.2 대시보드 주요 컴포넌트 테스트
**UnifiedDashboard**
- [ ] 사용자 정보 표시
- [ ] 휴가 잔여일 표시
- [ ] 최근 활동 표시
- [ ] 권한별 메뉴 표시

**UserManagement** 
- [ ] 사용자 목록 로드
- [ ] 사용자 생성/수정/삭제
- [ ] 권한 관리

**LeaveManagement**
- [ ] 휴가 신청 목록 로드
- [ ] 휴가 신청 생성
- [ ] 휴가 승인/거부

**PayrollManagement**
- [ ] 급여 데이터 로드
- [ ] 급여 계산
- [ ] 급여 명세서 생성

### 3단계: 브라우저 네트워크 분석
#### 3.1 API 요청 분석
- [ ] Authorization 헤더 포함 여부
- [ ] 401/403 오류 발생 API들 식별
- [ ] 성공하는 API vs 실패하는 API 분류

#### 3.2 콘솔 오류 분석
- [ ] JavaScript 런타임 오류
- [ ] API 호출 오류 
- [ ] React 컴포넌트 렌더링 오류

### 4단계: 체계적 수정
#### 4.1 우선순위별 수정 계획
**High Priority (대시보드 핵심 기능)**
1. `/api/auth/me` - 사용자 정보 조회 ✅ (이미 완료)
2. `/api/users/*` - 사용자 관리
3. `/api/leave/requests` - 휴가 신청 목록

**Medium Priority (주요 비즈니스 로직)**
4. `/api/leave/approve` - 휴가 승인
5. `/api/payroll/*` - 급여 관리
6. `/api/departments/*` - 부서 관리

**Low Priority (부가 기능)**
7. `/api/reports/*` - 보고서
8. `/api/admin/*` - 관리 기능
9. `/api/upload/*` - 파일 업로드

#### 4.2 수정 방법론
1. **일괄 치환**: `req.session.user` → `req.user`
2. **필드 매핑**: `req.session.user.id` → `req.user.id`
3. **에러 핸들링**: JWT 관련 오류 처리 추가
4. **테스트**: 각 수정 후 해당 API 테스트

## 예상 수정 필요 파일 목록

### ✅ 수정 완료된 파일들

**🔴 High Priority (완료)**
```
✅ /backend/routes/users.js - 13 occurrences → req.user 변경 완료
✅ /backend/routes/leave-refactored.js - 9 occurrences → req.user 변경 완료
✅ /backend/routes/leave/leaveRequests.js - 10 occurrences → req.user 변경 완료
```

**🟡 Medium Priority (완료)**
```
✅ /backend/routes/payroll.js - 7 occurrences → req.user 변경 완료
✅ /backend/routes/departments.js - 변경 완료
✅ /backend/routes/sales.js - 변경 완료
✅ /backend/routes/bonus.js - 변경 완료
```

**🟢 Low Priority (완료)**
```
✅ /backend/routes/reports.js - 변경 완료
✅ /backend/routes/admin.js - 변경 완료
✅ /backend/routes/upload.js - 변경 완료
✅ /backend/routes/positions.js - 변경 완료
✅ /backend/routes/users-refactored.js - 변경 완료
```

**추가 수정 파일들 (완료)**
```
✅ /backend/routes/leave/leaveCalendar.js - 변경 완료
✅ /backend/routes/leave/leaveBalance.js - 변경 완료
✅ /backend/routes/leave/leaveApproval.js - 변경 완료
✅ /backend/routes/leave/leaveCancellation.js - 변경 완료
✅ /backend/routes/leave/leaveExceptions.js - 변경 완료
✅ /backend/routes/leave/utils/leaveHelpers.js - 변경 완료
✅ /backend/middleware/performance.js - 변경 완료
```

**🎉 총 19개 파일 모든 `req.session.user` → `req.user` 변경 완료!**

## 테스트 도구
1. **브라우저 개발자 도구**
   - Network tab으로 API 요청/응답 분석
   - Console tab으로 JavaScript 오류 확인

2. **curl 명령어**
   - 개별 API 엔드포인트 직접 테스트
   - JWT 토큰 포함한 요청 테스트

3. **Postman/Insomnia**
   - API 컬렉션 생성해서 체계적 테스트

## 성공 기준
- [ ] 로그인 후 대시보드 완전 로드
- [ ] 사용자 목록 조회 성공
- [ ] 휴가 신청 목록 조회 성공  
- [ ] 급여 정보 조회 성공
- [ ] 권한별 메뉴 정상 표시
- [ ] 모든 CRUD 작업 정상 작동
- [ ] 콘솔에 JWT 관련 오류 없음

## 예상 소요 시간
- **분석**: 30분
- **High Priority 수정**: 1시간
- **Medium Priority 수정**: 1시간  
- **Low Priority 수정**: 30분
- **테스트 및 검증**: 30분
- **총 예상 시간**: 3.5시간

## 위험 요소
1. **데이터베이스 의존성**: 일부 API가 특정 DB 상태를 요구할 수 있음
2. **권한 체계**: JWT의 권한 정보가 기존 세션과 다를 수 있음
3. **중첩된 오류**: 한 API 오류가 다른 API에 연쇄 영향
4. **프론트엔드 타입 오류**: TypeScript 타입 불일치로 인한 추가 수정 필요

## 롤백 계획
- Git 브랜치로 현재 상태 백업
- 각 파일 수정 전 개별 백업
- 문제 발생 시 세션 기반 인증으로 즉시 롤백 가능