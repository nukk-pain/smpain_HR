# Unified Leave Overview - Old Components Cleanup Plan

## 목표
Unified Leave Overview 구현 완료 및 테스트 성공 후, 구 컴포넌트들을 제거하여 코드베이스를 정리하고 유지보수성을 향상시킨다.

## 🚨 발견된 문제점
1. **잘못된 파일 구조**: 
   - `AdminLeaveOverview`는 **pages** 폴더에 있음 (components 아님)
   - `TeamLeaveStatus`는 **components** 폴더에 있음
   - `TeamLeaveStatusPage`는 **pages** 폴더에 있고, `TeamLeaveStatus` 컴포넌트를 import함

2. **현재 라우팅 상태**:
   - App.tsx에 아직 구 컴포넌트들이 import되어 있음 (line 18, 24)
   - 이미 리다이렉트는 설정됨: `/admin/leave-overview` → `/admin/leave/overview`
   - `/supervisor/leave/status` → `/leave/overview` 리다이렉트 있음

3. **API 엔드포인트 참조**:
   - `services/api.ts`, `services/endpoints.ts`에 `/admin/leave/overview` 엔드포인트 참조 있음
   - UnifiedLeaveOverview도 같은 엔드포인트 사용 중 (정상)

## 현재 상황
- ✅ UnifiedLeaveOverview 컴포넌트 구현 완료
- ✅ 모든 기능 테스트 완료 (2025.08.20)
- ✅ Admin과 Supervisor 역할별 접근 제어 작동 확인
- 🔄 구 컴포넌트들이 아직 코드베이스에 남아있음

## 제거 대상 파일들 (수정됨)

### 1. 컴포넌트/페이지 파일
- `frontend/src/pages/AdminLeaveOverview.tsx` (페이지)
- `frontend/src/components/TeamLeaveStatus.tsx` (컴포넌트)
- `frontend/src/pages/TeamLeaveStatusPage.tsx` (페이지)

### 2. 관련 임포트 정리 필요 파일
- `frontend/src/App.tsx` - 구 컴포넌트 import 및 사용하지 않는 변수 제거
- `frontend/src/components/Layout.tsx` - 구 메뉴 항목 확인

## 작업 계획

### Phase 1: 의존성 분석 (5분)
- [ ] 구 컴포넌트들을 참조하는 모든 파일 검색
- [ ] import 문 확인
- [ ] 라우팅 참조 확인
- [ ] 메뉴 네비게이션 참조 확인

### Phase 2: 백업 생성 (2분)
- [ ] 구 컴포넌트 파일들을 `/completed/backup/` 폴더로 복사
- [ ] 삭제 전 최종 상태 기록

### Phase 3: App.tsx 라우팅 정리 (5분)
- [ ] 구 라우트 제거:
  - `/admin/leave-overview` (AdminLeaveOverview)
  - `/supervisor/team-leave` (TeamLeaveStatus)
  - `/team-leave-status` (TeamLeaveStatusPage)
- [ ] import 문 제거
- [ ] 하위 호환성을 위한 리다이렉트 추가 (선택사항):
  ```tsx
  // 구 URL 접근 시 새 URL로 리다이렉트
  <Route path="/admin/leave-overview" element={<Navigate to="/leave/overview" replace />} />
  <Route path="/supervisor/team-leave" element={<Navigate to="/leave/overview" replace />} />
  ```

### Phase 4: Layout.tsx 메뉴 정리 (5분)
- [ ] 구 메뉴 항목 확인 및 업데이트
- [ ] 중복 메뉴 항목 제거
- [ ] 새로운 통합 메뉴 항목만 유지

### Phase 5: 컴포넌트 파일 삭제 (2분)
- [ ] `AdminLeaveOverview.tsx` 삭제
- [ ] `TeamLeaveStatus.tsx` 삭제
- [ ] `TeamLeaveStatusPage.tsx` 삭제

### Phase 6: 빌드 및 테스트 (10분)
- [ ] TypeScript 컴파일 확인: `npm run build-check`
- [ ] 개발 서버 재시작
- [ ] 브라우저에서 기능 테스트:
  - [ ] Admin 로그인 → `/leave/overview` 접근
  - [ ] Supervisor 로그인 → `/leave/overview` 접근
  - [ ] 모든 뷰 정상 작동 확인

### Phase 7: 문서 업데이트 (5분)
- [ ] `todo-development.md` 업데이트
- [ ] `FUNCTIONS_VARIABLES.md`에서 구 함수 제거
- [ ] 정리 완료 보고서 작성

## 예상 리스크 및 대응

### 리스크 1: 숨겨진 의존성
- **문제**: 다른 컴포넌트에서 구 컴포넌트를 import하고 있을 수 있음
- **해결**: grep/검색으로 모든 참조 확인 후 제거

### 리스크 2: 북마크/직접 URL 접근
- **문제**: 사용자가 구 URL을 북마크했을 수 있음
- **해결**: Navigate 컴포넌트로 리다이렉트 구현

### 리스크 3: 문서/가이드 참조
- **문제**: 사용자 가이드나 문서에 구 URL이 있을 수 있음
- **해결**: 문서 검색 및 업데이트

## 롤백 계획
문제 발생 시:
1. Git에서 이전 커밋으로 복원
2. `/completed/backup/` 폴더에서 파일 복원
3. 문제 분석 후 재시도

## 성공 기준
- ✅ TypeScript 컴파일 에러 없음
- ✅ 모든 휴가 관리 기능 정상 작동
- ✅ Admin/Supervisor 역할별 접근 제어 유지
- ✅ 코드베이스 크기 감소 (약 2,000줄 예상)
- ✅ 중복 코드 완전 제거

## 예상 소요 시간
총 35분 (테스트 포함)

## 다음 단계
정리 완료 후:
1. 성능 최적화 작업 진행
2. Jest 테스트 추가
3. 사용자 가이드 업데이트