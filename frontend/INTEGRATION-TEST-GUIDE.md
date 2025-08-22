# Frontend Integration Test Guide

## 개요
이 문서는 Frontend 컴포넌트 테스트를 Mock 기반에서 실제 백엔드 통합 테스트로 전환하는 가이드입니다.

## 테스트 전략 변경

### 기존 방식 (Mock 기반)
```javascript
// Mock을 사용한 단위 테스트
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));
```

### 새로운 방식 (통합 테스트)
```javascript
// 실제 백엔드 서버와 MongoDB 사용
import { setupIntegrationTests, testApi } from '../test/setup.integration';

setupIntegrationTests();

// 실제 API 호출
const response = await testApi.post('/auth/login', {
  username: 'admin',
  password: 'admin'
});
```

## 장점과 단점

### 통합 테스트의 장점
- **실제 동작 검증**: 프론트엔드-백엔드-DB 전체 플로우 테스트
- **통합 문제 조기 발견**: API 불일치, 데이터 형식 문제 즉시 발견
- **CLAUDE.md 준수**: "Never use mock data" 원칙 준수
- **실제 데이터 검증**: 실제 데이터베이스 제약조건 테스트
- **E2E에 가까운 신뢰성**: 실제 사용자 경험과 유사

### 통합 테스트의 단점
- **느린 실행 속도**: 네트워크 통신으로 인한 지연
- **환경 의존성**: 백엔드 서버와 MongoDB 필요
- **테스트 격리 어려움**: 테스트 간 데이터 충돌 가능
- **CI/CD 복잡도 증가**: 테스트 환경 구성 필요

## 테스트 환경 설정

### 1. 백엔드 서버 실행
```bash
cd backend
npm run dev  # localhost:5455에서 실행
```

### 2. MongoDB 확인
```bash
# MongoDB가 실행 중인지 확인
mongosh
> use SM_nomu
> db.users.findOne({username: 'admin'})
```

### 3. 테스트 실행
```bash
cd frontend
npm test -- src/components/AuthProvider.integration.test.tsx
```

## 테스트 헬퍼 함수

### setup.integration.ts
```typescript
// 관리자 토큰 가져오기
export const getAdminToken = async (): Promise<string>

// 테스트 사용자 생성
export const createTestUser = async (userData: any)

// 테스트 데이터 정리
export const cleanupTestData = async ()

// 백엔드 상태 확인
export const checkBackendHealth = async (): Promise<boolean>
```

## 테스트 작성 예시

### 인증 테스트
```typescript
it('handles successful admin login', async () => {
  const user = userEvent.setup();
  renderWithProvider();
  
  const loginButton = screen.getByRole('button', { name: 'Login Admin' });
  await user.click(loginButton);
  
  await waitFor(() => {
    expect(screen.getByTestId('user-info')).toBeInTheDocument();
  }, { timeout: 5000 });
  
  const token = localStorage.getItem('hr_auth_token');
  expect(token).toBeTruthy();
});
```

### 데이터 CRUD 테스트
```typescript
beforeAll(async () => {
  // 테스트 데이터 생성
  testUser = await createTestUser({
    username: 'test_user',
    password: 'testpass',
    role: 'User'
  });
});

afterAll(async () => {
  // 테스트 데이터 정리
  await cleanupTestData();
});
```

## API URL 설정

### 테스트 환경에서 API URL 변경
```typescript
beforeAll(() => {
  // @ts-ignore - private 속성 접근
  if (apiService.api) {
    apiService.api.defaults.baseURL = 'http://localhost:5455/api';
  }
});
```

## 주의사항

1. **테스트 데이터 격리**
   - 테스트 사용자는 `test_` 접두사 사용
   - 테스트 이메일은 `@test.com` 도메인 사용
   - 각 테스트 후 데이터 정리

2. **타임아웃 설정**
   - 네트워크 요청에 충분한 시간 할당
   - `waitFor`에 timeout 옵션 사용 (5000ms 권장)

3. **백엔드 의존성**
   - 테스트 전 백엔드 서버 실행 확인
   - MongoDB 접근 가능 확인

4. **토큰 관리**
   - 실제 JWT 토큰 사용
   - localStorage 키: `hr_auth_token`

## 테스트 현황 (2025년 8월 22일)

| 컴포넌트 | Mock 테스트 | 통합 테스트 | 상태 |
|---------|------------|------------|------|
| Login | 8/8 | - | Mock 유지 |
| UserManagement | 6/6 | - | Mock 유지 |
| LeaveManagement | 4/8 | - | Mock 유지 |
| Dashboard | 5/5 | - | Mock 유지 |
| PayrollGrid | 8/8 | - | Mock 유지 |
| DepartmentManagement | 8/8 | - | Mock 유지 |
| NotificationProvider | 7/8 | - | Mock 유지 |
| AuthProvider | - | 8/8 | ✅ 통합 완료 |
| Settings | - | 대기 중 | 작업 필요 |

## 향후 계획

1. **Phase 3 완료**: Settings 컴포넌트 테스트 작성
2. **Phase 4**: E2E 시나리오 테스트 (12개 시나리오)
3. **Phase 5**: CI/CD 통합
4. **점진적 전환**: 중요 컴포넌트부터 통합 테스트로 전환

## 참고 문서
- [TEST-01-integration-test-suite-plan.md](../TEST-01-integration-test-suite-plan.md)
- [CLAUDE.md](../CLAUDE.md) - "Never use mock data" 원칙
- [Vitest Documentation](https://vitest.dev/)