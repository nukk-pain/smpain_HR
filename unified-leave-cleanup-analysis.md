# Unified Leave Overview - 정리 전 분석 결과

## 🔍 현재 상태 분석

### 1. 구 컴포넌트 import 상태 (App.tsx)
```typescript
// Line 18: import되지만 사용 안 됨
const TeamLeaveStatusPage = React.lazy(() => import('./pages/TeamLeaveStatusPage'))

// Line 24: import되지만 사용 안 됨  
const AdminLeaveOverview = React.lazy(() => import('./pages/AdminLeaveOverview'))
```

### 2. 실제 라우팅 상태
- ❌ 구 컴포넌트를 사용하는 라우트 없음
- ✅ 모든 휴가 관련 라우트는 `UnifiedLeaveOverviewPage` 사용
- ✅ 리다이렉트 설정:
  - `/admin/leave-overview` → `/admin/leave/overview` → `/leave/overview`
  - `/supervisor/leave/status` → `/leave/overview`

### 3. 파일 위치
- `frontend/src/pages/AdminLeaveOverview.tsx` - 사용 안 됨
- `frontend/src/components/TeamLeaveStatus.tsx` - TeamLeaveStatusPage에서만 import
- `frontend/src/pages/TeamLeaveStatusPage.tsx` - 사용 안 됨

### 4. API 엔드포인트
- `/admin/leave/overview` - UnifiedLeaveOverview에서 계속 사용 중 (정상)
- services/api.ts, endpoints.ts의 참조는 유지 필요

## ✅ 안전하게 제거 가능한 항목

### 즉시 제거 가능
1. **App.tsx에서 import 제거**:
   - Line 18: `TeamLeaveStatusPage` import
   - Line 24: `AdminLeaveOverview` import

2. **파일 삭제**:
   - `frontend/src/pages/AdminLeaveOverview.tsx`
   - `frontend/src/pages/TeamLeaveStatusPage.tsx`
   - `frontend/src/components/TeamLeaveStatus.tsx`

### 유지해야 할 항목
1. **API 관련**:
   - services/api.ts의 `getAdminLeaveOverview()` 메서드 - UnifiedLeaveOverview가 사용
   - services/endpoints.ts의 `ADMIN.LEAVE_OVERVIEW` - 계속 필요

2. **리다이렉트**:
   - 북마크 사용자를 위한 기존 리다이렉트 유지

## 🎯 결론
**구 컴포넌트들은 이미 사용되지 않고 있으므로 안전하게 제거 가능합니다.**

제거 시 영향:
- 코드 크기 감소: 약 2,000줄
- TypeScript 컴파일: 사용하지 않는 import 경고만 제거
- 기능 영향: 없음 (이미 사용 안 됨)
- 리스크: 매우 낮음