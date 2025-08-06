# 이메일 필드 완전 제거 계획

## 현재 상황
- 이메일 필드는 UI에서 제거되었지만 코드와 DB에는 여전히 많은 이메일 관련 코드가 존재
- 이로 인해 혼란과 불필요한 코드 유지보수 발생
- 완전한 제거를 통해 코드베이스 정리 필요

## 제거 대상 분석

### 1. 백엔드 (Backend)
```
backend/config/database-indexes.js:49 - 이메일 유니크 인덱스
backend/validation/schemas.js:12,41,57,88 - 이메일 패턴 및 검증 스키마
backend/middleware/validation.js:11,28 - 이메일 검증 미들웨어
```

### 2. 프론트엔드 (Frontend)
```
frontend/src/utils/userValidation.ts - 이메일 검증 함수들
frontend/src/components/UserFormSections.tsx - 이메일 폼 섹션
frontend/src/components/UserDetails.tsx - 이메일 표시 컴포넌트
frontend/src/components/UserFilters.tsx - 이메일 필터 옵션
frontend/src/hooks/useUserFilters.ts - 이메일 필터링/정렬
frontend/src/hooks/useUserManagement.ts - 이메일 타입 정의
frontend/src/services/endpoints.ts - 이메일 타입 정의
frontend/src/config/index.ts - 개발용 이메일 설정
```

### 3. 데이터베이스
```
MongoDB 컬렉션에서 email 필드 제거
이메일 유니크 인덱스 제거
```

### 4. 문서 및 스크립트
```
docs/api/DOCUMENTATION.md - API 문서의 이메일 필드 설명
scripts/create-test-users.js - 테스트 사용자 이메일
scripts/resetDatabase.js - admin 계정 이메일
scripts/synology/ - 시놀로지 스크립트의 이메일
```

## 제거 계획 (단계별)

### Phase 1: 백엔드 정리 ✅ COMPLETED
- [x] **1.1** `backend/validation/schemas.js`에서 이메일 패턴 및 검증 제거
- [x] **1.2** `backend/middleware/validation.js`에서 이메일 검증 미들웨어 제거
- [x] **1.3** 사용자 생성/수정 API에서 이메일 처리 로직 제거
- [x] **1.4** API 응답에서 이메일 필드 제거 (이미 제거된 것 같음)

### Phase 2: 프론트엔드 정리 ✅ COMPLETED
- [x] **2.1** `frontend/src/utils/userValidation.ts`에서 이메일 검증 함수 제거
- [x] **2.2** `frontend/src/components/UserFormSections.tsx`에서 이메일 폼 섹션 제거
- [x] **2.3** `frontend/src/components/UserDetails.tsx`에서 이메일 표시 부분 제거
- [x] **2.4** `frontend/src/components/UserFilters.tsx`에서 이메일 필터 옵션 제거 (해당 없음)
- [x] **2.5** `frontend/src/hooks/useUserFilters.ts`에서 이메일 관련 타입 및 로직 제거 (해당 없음)
- [x] **2.6** `frontend/src/hooks/useUserManagement.ts`에서 이메일 타입 정의 제거 (해당 없음)
- [x] **2.7** `frontend/src/services/endpoints.ts`에서 이메일 타입 제거 (해당 없음)
- [x] **2.8** `frontend/src/config/index.ts`에서 개발용 이메일 설정 제거 (해당 없음)

### Phase 3: 데이터베이스 정리 ✅ COMPLETED
- [x] **3.1** `backend/config/database-indexes.js`에서 이메일 인덱스 생성 코드 제거
- [x] **3.2** 기존 MongoDB에서 이메일 인덱스 드롭
- [x] **3.3** 기존 사용자 데이터에서 email 필드 제거 (선택사항 - 인덱스 제거로 충분)

### Phase 4: 문서 및 스크립트 정리 ✅ COMPLETED
- [x] **4.1** `docs/api/DOCUMENTATION.md`에서 이메일 필드 관련 문서 제거
- [x] **4.2** `scripts/create-test-users.js`에서 이메일 필드 제거
- [x] **4.3** `scripts/resetDatabase.js`에서 admin 이메일 제거
- [x] **4.4** `scripts/synology/`에서 이메일 관련 코드 제거
- [x] **4.5** 테스트 계획 파일들에서 이메일 관련 테스트 제거

### Phase 5: 검증 및 테스트 ✅ COMPLETED
- [x] **5.1** 사용자 생성 기능 테스트 - 이메일 없이 정상 작동
- [x] **5.2** 사용자 조회/수정 기능 테스트 - API 응답에서 이메일 필드 완전 제거 확인
- [x] **5.3** 필터링/검색 기능 테스트 - 이름/부서 기반 검색만 작동
- [x] **5.4** API 응답 구조 확인 - 모든 이메일 참조 제거됨
- [x] **5.5** 프론트엔드 UI 동작 확인 - 이메일 관련 UI 요소 모두 제거됨

## 예상 영향도

### 긍정적 영향
- 코드베이스 정리 및 유지보수성 향상
- 개발자 혼란 제거
- 불필요한 검증 로직 제거로 성능 미세 개선
- API 응답 크기 감소

### 주의사항
- 기존 사용자 데이터에 이메일이 저장되어 있을 수 있음
- 로그나 백업에서 이메일 정보 참조하는 부분 확인 필요
- 외부 시스템과의 연동에서 이메일 사용 여부 확인

## 실행 방법

각 Phase별로 순차적으로 진행:
1. 백엔드 먼저 정리 (API 안정화)
2. 프론트엔드 정리 (UI 정상화)  
3. 데이터베이스 정리 (데이터 일관성)
4. 문서 및 스크립트 정리 (개발 환경 정리)
5. 최종 검증

## 롤백 계획

각 Phase별로 commit을 분리하여 필요시 롤백 가능하도록 함:
- Phase 1-4: 각각 별도 commit
- Phase 5에서 문제 발견시 해당 Phase 롤백
- 전체 작업 완료 후 통합 테스트

## 예상 소요 시간

- Phase 1: 30분 (백엔드 정리)
- Phase 2: 1시간 (프론트엔드 정리)  
- Phase 3: 20분 (DB 정리)
- Phase 4: 20분 (문서/스크립트 정리)
- Phase 5: 30분 (테스트)

**총 예상 시간: 약 2시간 40분**