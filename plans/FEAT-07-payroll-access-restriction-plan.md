# FEAT-07: 급여 기능 접근 권한 제한

## 개요
- **목적**: 급여 기능을 Admin 전용으로 제한하고, Supervisor에서 급여 관련 메뉴/페이지 접근 차단
- **예상 소요 시간**: 1~1.5일  
- **우선순위**: HIGH
- **작성일**: 2025-09-03

## 현재 상태 분석

### Backend 권한 현황
- 대부분의 급여 API는 이미 Admin 권한 요구
- 일부 엔드포인트가 Supervisor도 허용 가능
- 연차 기능은 기존 권한 유지 필요

### Frontend 접근 현황
- Supervisor 역할도 급여 메뉴 접근 가능
- 라우트 보호가 완전하지 않음
- UI 메뉴에서 급여 관련 항목 표시됨

## TDD 개발 계획

### Phase 1: Backend 권한 제한 (Red → Green → Refactor)

#### Test 1.1: 급여 API Admin 전용 테스트
```javascript
// backend/test/payroll-permission.test.js
describe('Payroll API Permission Tests', () => {
  test('should deny Supervisor access to payroll list', async () => {
    const supervisorToken = await loginAs('supervisor');
    const response = await request(app)
      .get('/api/payroll/list')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Admin only');
  });

  test('should allow Admin access to payroll list', async () => {
    const adminToken = await loginAs('admin');
    const response = await request(app)
      .get('/api/payroll/list')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
  });
});
```

#### Implementation 1.1: Backend 권한 업데이트
- `/backend/routes/payroll.js` - 모든 엔드포인트에 Admin 전용 미들웨어 적용
- `/backend/routes/bonus.js` - Admin 전용으로 변경
- `/backend/routes/sales.js` - Admin 전용으로 변경
- `/backend/routes/dailyWorkers.js` - Admin 전용으로 변경

### Phase 2: Frontend 접근 제한 (Red → Green → Refactor)

#### Test 2.1: 라우트 보호 테스트
```typescript
// frontend/src/components/PayrollManagement.test.tsx
describe('PayrollManagement Access Control', () => {
  test('should redirect Supervisor to unauthorized page', () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setUser({ role: 'Supervisor' });
    });
    
    const { container } = render(
      <MemoryRouter initialEntries={['/payroll']}>
        <PayrollManagement />
      </MemoryRouter>
    );
    
    expect(container).toHaveTextContent('Unauthorized');
  });

  test('should allow Admin access', () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setUser({ role: 'Admin' });
    });
    
    const { container } = render(<PayrollManagement />);
    expect(container).toHaveTextContent('Payroll Management');
  });
});
```

#### Implementation 2.1: Frontend 보호 구현
- `ProtectedRoute` 컴포넌트에 역할 기반 보호 추가
- 급여 관련 라우트에 `requiredRole="Admin"` 속성 추가
- Navigation 컴포넌트에서 역할별 메뉴 필터링

### Phase 3: UI 정리 (Red → Green → Refactor)

#### Test 3.1: 메뉴 표시 테스트
```typescript
// frontend/src/components/Navigation.test.tsx
describe('Navigation Menu Filtering', () => {
  test('should not show payroll menu for Supervisor', () => {
    const { queryByText } = render(
      <Navigation userRole="Supervisor" />
    );
    
    expect(queryByText('Payroll')).toBeNull();
    expect(queryByText('Bonus')).toBeNull();
    expect(queryByText('Sales')).toBeNull();
    expect(queryByText('Daily Workers')).toBeNull();
  });

  test('should show leave menu for Supervisor', () => {
    const { getByText } = render(
      <Navigation userRole="Supervisor" />
    );
    
    expect(getByText('Leave Management')).toBeInTheDocument();
  });
});
```

#### Implementation 3.1: UI 업데이트
- Navigation/Sidebar 컴포넌트 메뉴 필터링
- Dashboard 위젯 조건부 렌더링
- 급여 관련 빠른 액션 버튼 제거

## 구현 세부사항

### 1. Backend 변경사항

#### 1.1 미들웨어 업데이트
```javascript
// backend/middleware/permissions.js
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      message: 'Admin access only' 
    });
  }
  next();
};
```

#### 1.2 라우트 보호 적용
```javascript
// backend/routes/payroll.js
router.use(requireAdmin); // 모든 급여 엔드포인트에 적용

// backend/routes/bonus.js
router.use(requireAdmin);

// backend/routes/sales.js  
router.use(requireAdmin);

// backend/routes/dailyWorkers.js
router.use(requireAdmin);
```

### 2. Frontend 변경사항

#### 2.1 ProtectedRoute 컴포넌트
```typescript
// frontend/src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  requiredRole?: 'Admin' | 'Supervisor' | 'User';
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  requiredRole, 
  children 
}) => {
  const { user } = useAuth();
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
};
```

#### 2.2 라우트 설정
```typescript
// frontend/src/App.tsx
<Route path="/payroll/*" element={
  <ProtectedRoute requiredRole="Admin">
    <PayrollManagement />
  </ProtectedRoute>
} />
```

#### 2.3 메뉴 필터링
```typescript
// frontend/src/components/Navigation.tsx
const menuItems = [
  {
    text: 'Payroll',
    path: '/payroll',
    icon: <PaymentIcon />,
    roles: ['Admin'] // Admin만 표시
  },
  {
    text: 'Leave',
    path: '/leave',
    icon: <EventIcon />,
    roles: ['Admin', 'Supervisor', 'User'] // 모든 역할
  }
];

const filteredItems = menuItems.filter(item => 
  item.roles.includes(user.role)
);
```

## 테스트 계획

### 1. 단위 테스트
- [ ] Backend 권한 미들웨어 테스트
- [ ] Frontend ProtectedRoute 테스트
- [ ] Navigation 메뉴 필터링 테스트

### 2. 통합 테스트
- [ ] Supervisor 로그인 → 급여 접근 차단 확인
- [ ] Admin 로그인 → 급여 접근 허용 확인
- [ ] API 직접 호출 차단 확인

### 3. E2E 테스트
- [ ] 전체 사용자 플로우 테스트
- [ ] 권한 변경 시 즉시 반영 확인

## 영향 범위

### 영향받는 파일
- Backend:
  - `/backend/routes/payroll.js`
  - `/backend/routes/bonus.js`
  - `/backend/routes/sales.js`
  - `/backend/routes/dailyWorkers.js`
  - `/backend/middleware/permissions.js`

- Frontend:
  - `/frontend/src/App.tsx`
  - `/frontend/src/components/ProtectedRoute.tsx`
  - `/frontend/src/components/Navigation.tsx`
  - `/frontend/src/components/Sidebar.tsx`
  - `/frontend/src/components/Dashboard.tsx`

### 영향받지 않는 기능
- 연차 관리 (Leave Management)
- 사용자 관리 (User Management)
- 부서 관리 (Department Management)

## 롤백 계획

만약 문제 발생 시:
1. Git revert로 변경사항 되돌리기
2. 기존 권한 설정 복원
3. 긴급 패치 배포

## 성공 기준

- [ ] 모든 급여 API가 Admin 전용으로 제한됨
- [ ] Supervisor 로그인 시 급여 메뉴 표시 안 됨
- [ ] 직접 URL 접근도 차단됨
- [ ] 연차 기능은 정상 작동
- [ ] 모든 테스트 통과

## 주의사항

1. **기존 세션 처리**: 이미 로그인된 Supervisor 세션 처리 필요
2. **에러 메시지**: 명확한 권한 부족 메시지 표시
3. **로깅**: 권한 거부 시도 로깅
4. **문서화**: 변경사항 API 문서 업데이트

## 완료 체크리스트

- [ ] Backend 권한 테스트 작성
- [ ] Backend 권한 구현
- [ ] Frontend 접근 테스트 작성
- [ ] Frontend 접근 구현
- [ ] UI 메뉴 테스트 작성
- [ ] UI 메뉴 정리
- [ ] 통합 테스트 수행
- [ ] 문서 업데이트
- [ ] PR 생성 및 리뷰