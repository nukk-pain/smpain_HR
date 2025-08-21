# 통합 테스트 스위트 구축 계획 (Integration Test Suite)

## 📋 개요

### 목적
- 현재 수동 테스트 중심의 시스템을 자동화된 테스트 체계로 전환
- 코드 변경 시 자동으로 전체 기능 검증
- 회귀 버그 방지 및 코드 품질 향상

### 현재 상태
- **수동 테스트**: TEST_GUIDE.md 문서 기반
- **일부 테스트 존재**: UnifiedLeaveOverview.test.tsx 등 산발적 존재
- **실제 DB 사용**: Mock 없이 MongoDB 직접 연결 (CLAUDE.md 원칙)

### 목표
- **테스트 커버리지**: 70% 이상
- **자동화 수준**: CI/CD 파이프라인 통합
- **실행 시간**: 전체 테스트 5분 이내

## 🎯 TDD 원칙 적용 (CLAUDE.md 준수)

### Kent Beck의 TDD 사이클
1. **Red**: 실패하는 테스트 먼저 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 구현
3. **Refactor**: 테스트가 통과한 상태에서 코드 개선

### 구현 전략
- **테스트 우선 작성**: 새 기능 추가 시 반드시 테스트부터 작성
- **작은 단위로 진행**: 한 번에 하나의 테스트만 작성하고 구현
- **실제 MongoDB 사용**: Mock 없이 테스트 전용 실제 DB 인스턴스 사용
- **구조적 변경과 행동 변경 분리**: Tidy First 원칙 적용

## 🏗️ 아키텍처

```
tests/
├── backend/
│   ├── unit/           # 개별 함수/모듈 테스트
│   ├── integration/    # API 엔드포인트 테스트
│   └── e2e/           # 전체 시나리오 테스트
├── frontend/
│   ├── components/    # 컴포넌트 단위 테스트
│   ├── hooks/        # 커스텀 훅 테스트
│   └── pages/        # 페이지 통합 테스트
└── shared/
    ├── fixtures/     # 테스트 데이터
    └── helpers/      # 테스트 유틸리티
```

## 📊 Phase별 구현 계획

### Phase 1: 테스트 환경 설정 (2일)

#### Backend 설정
```bash
npm install --save-dev jest supertest
npm install --save-dev @types/jest @types/supertest
```

**jest.config.js**
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  // 실제 MongoDB 사용을 위한 설정
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  setupFilesAfterEnv: ['./tests/setup/setupTests.js']
};
```

**tests/setup/globalSetup.js**
```javascript
const { MongoClient } = require('mongodb');

module.exports = async () => {
  // 테스트 전용 실제 MongoDB 데이터베이스 준비
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('hr_test');
  
  // 테스트 초기 데이터 설정
  await db.collection('users').insertMany([
    { username: 'admin', password: '$2a$10$...', role: 'Admin' },
    { username: 'supervisor', password: '$2a$10$...', role: 'Supervisor' },
    { username: 'user', password: '$2a$10$...', role: 'User' }
  ]);
  
  global.__MONGO_CLIENT__ = client;
};
```

#### Frontend 설정
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event msw
```

**vitest.config.ts** (이미 존재)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
});
```

### Phase 2: Backend API 테스트 (3일)

#### 테스트할 API 엔드포인트 목록 (35개)

**인증 (4개)**
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout  
- [ ] GET /api/auth/check
- [ ] POST /api/auth/verify-password

**사용자 관리 (6개)**
- [ ] GET /api/users
- [ ] GET /api/users/:id
- [ ] POST /api/users
- [ ] PUT /api/users/:id
- [ ] DELETE /api/users/:id
- [ ] PUT /api/users/:id/deactivate

**휴가 관리 (8개)**
- [ ] GET /api/leave/balance/:userId
- [ ] GET /api/leave/requests
- [ ] POST /api/leave/request
- [ ] PUT /api/leave/approve/:requestId
- [ ] PUT /api/leave/reject/:requestId
- [ ] GET /api/leave/overview
- [ ] GET /api/leave/admin/export/excel
- [ ] PUT /api/leave/balance/adjust

**급여 관리 (7개)**
- [ ] GET /api/payroll/:year_month
- [ ] POST /api/payroll/upload
- [ ] POST /api/payroll/preview
- [ ] POST /api/payroll/save
- [ ] PUT /api/payroll/:id
- [ ] GET /api/payroll/employee/:userId
- [ ] GET /api/payroll/export/:year_month

**부서 관리 (4개)**
- [ ] GET /api/departments
- [ ] POST /api/departments
- [ ] PUT /api/departments/:id
- [ ] DELETE /api/departments/:id

**문서 관리 (4개)**
- [ ] GET /api/documents
- [ ] POST /api/documents/upload
- [ ] PUT /api/documents/:id/replace
- [ ] DELETE /api/documents/:id

**보고서 (2개)**
- [ ] GET /api/reports/payroll/:year_month
- [ ] POST /api/reports/payslip/bulk-upload

#### 2.1 인증 API 테스트 (TDD 적용)
```javascript
// tests/backend/integration/auth.test.js
describe('Authentication API', () => {
  test('POST /api/auth/login - valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('Admin');
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  test('GET /api/auth/check - with valid token', async () => {
    const token = await getValidToken();
    const response = await request(app)
      .get('/api/auth/check')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
  });
});
```

#### 2.2 휴가 관리 API 테스트
```javascript
// tests/backend/integration/leave.test.js
describe('Leave Management API', () => {
  test('GET /api/leave/balance/:userId', async () => {
    const response = await request(app)
      .get('/api/leave/balance/test-user-id')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('annual_leave_balance');
    expect(response.body).toHaveProperty('sick_leave_balance');
  });

  test('POST /api/leave/request', async () => {
    const leaveRequest = {
      leave_type: 'annual',
      start_date: '2025-09-01',
      end_date: '2025-09-03',
      reason: '개인 휴가'
    };
    
    const response = await request(app)
      .post('/api/leave/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send(leaveRequest);
    
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
  });

  test('PUT /api/leave/approve/:requestId', async () => {
    const response = await request(app)
      .put('/api/leave/approve/test-request-id')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ action: 'approved' });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('approved');
  });
});
```

#### 2.3 급여 관리 API 테스트
```javascript
// tests/backend/integration/payroll.test.js
describe('Payroll API', () => {
  test('GET /api/payroll/:year_month', async () => {
    const response = await request(app)
      .get('/api/payroll/2025-08')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toHaveProperty('base_salary');
  });

  test('POST /api/payroll/upload', async () => {
    const response = await request(app)
      .post('/api/payroll/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', 'tests/fixtures/payroll-sample.xlsx');
    
    expect(response.status).toBe(200);
    expect(response.body.processed).toBeGreaterThan(0);
  });
});
```

### Phase 3: Frontend 컴포넌트 테스트 (3일)

#### 테스트할 컴포넌트 목록 (25개)

**인증/권한 (3개)**
- [ ] Login.tsx
- [ ] AuthProvider.tsx
- [ ] ProtectedRoute.tsx

**휴가 관리 (5개)**
- [ ] LeaveManagement.tsx
- [ ] LeaveRequestDialog.tsx
- [ ] LeaveBalanceCard.tsx
- [ ] UnifiedLeaveOverview.tsx
- [ ] LeaveAnalyticsCharts.tsx

**급여 관리 (6개)**
- [ ] PayrollGrid.tsx
- [ ] PayrollExcelUploadWithPreview.tsx
- [ ] PayrollEditDialog.tsx
- [ ] PayrollPrintPreview.tsx
- [ ] PayrollDashboard.tsx
- [ ] PayrollFieldMappingStep.tsx

**사용자 관리 (3개)**
- [ ] UserManagement.tsx
- [ ] UserEditDialog.tsx
- [ ] UserProfile.tsx

**부서 관리 (2개)**
- [ ] DepartmentManagement.tsx
- [ ] DepartmentEditDialog.tsx

**문서 관리 (3개)**
- [ ] MyDocuments.tsx
- [ ] AdminDocuments.tsx
- [ ] PayslipBulkUpload.tsx

**공통 컴포넌트 (3개)**
- [ ] Layout.tsx
- [ ] UnifiedDashboard.tsx
- [ ] Notifications.tsx

#### 3.1 핵심 컴포넌트 테스트 (TDD 적용)
```typescript
// tests/frontend/components/LeaveManagement.test.tsx
describe('LeaveManagement Component', () => {
  test('displays leave balance correctly', async () => {
    render(
      <AuthProvider initialUser={mockUser}>
        <LeaveManagement />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('연차 잔여: 15일')).toBeInTheDocument();
    });
  });

  test('opens leave request dialog', async () => {
    render(<LeaveManagement />);
    
    const requestButton = screen.getByText('휴가 신청');
    await userEvent.click(requestButton);
    
    expect(screen.getByText('휴가 신청서')).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
  });

  test('submits leave request successfully', async () => {
    render(<LeaveManagement />);
    
    await userEvent.click(screen.getByText('휴가 신청'));
    await userEvent.type(screen.getByLabelText('사유'), '가족 여행');
    await userEvent.click(screen.getByText('제출'));
    
    await waitFor(() => {
      expect(screen.getByText('휴가 신청이 완료되었습니다')).toBeInTheDocument();
    });
  });
});
```

#### 3.2 커스텀 훅 테스트
```typescript
// tests/frontend/hooks/useLeaveData.test.ts
describe('useLeaveData Hook', () => {
  test('fetches leave data successfully', async () => {
    const { result } = renderHook(() => useLeaveData('2025'));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
    expect(result.current.data.employees).toBeInstanceOf(Array);
  });

  test('handles error states', async () => {
    server.use(
      rest.get('/api/leave/overview', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { result } = renderHook(() => useLeaveData('2025'));
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Phase 4: E2E 시나리오 테스트 (2일)

#### 테스트할 E2E 시나리오 (12개)

**사용자 시나리오 (4개)**
- [ ] 로그인 → 프로필 확인 → 비밀번호 변경
- [ ] 휴가 신청 → 승인 대기 → 잔여일수 확인
- [ ] 급여명세서 조회 → PDF 다운로드
- [ ] 내 문서함 → 문서 검색 → 다운로드

**Supervisor 시나리오 (3개)**
- [ ] 팀원 휴가 승인/거절 플로우
- [ ] 팀 휴가 현황 조회 → Excel 내보내기
- [ ] 부서 통계 확인 → 리포트 생성

**Admin 시나리오 (5개)**
- [ ] 사용자 생성 → 권한 설정 → 부서 배정
- [ ] 급여 Excel 업로드 → 계산 → 검토 → 저장
- [ ] 휴가 잔여일수 조정 → 이력 확인
- [ ] 급여명세서 일괄 업로드 → 직원 매칭 → 배포
- [ ] 부서 생성/수정/삭제 전체 플로우

#### 4.1 휴가 신청 전체 플로우 (TDD 적용)
```javascript
// tests/e2e/leave-request-flow.test.js
describe('Leave Request Complete Flow', () => {
  test('User requests leave → Supervisor approves → Balance updates', async () => {
    // 1. 사용자 로그인
    await loginAs('user');
    
    // 2. 현재 잔여일수 확인
    const initialBalance = await getLeaveBalance();
    expect(initialBalance.annual).toBe(15);
    
    // 3. 휴가 신청 (3일)
    const requestId = await submitLeaveRequest({
      type: 'annual',
      days: 3,
      reason: '가족 여행'
    });
    
    // 4. Supervisor로 전환
    await loginAs('supervisor');
    
    // 5. 휴가 승인
    await approveLeaveRequest(requestId);
    
    // 6. 사용자로 다시 전환
    await loginAs('user');
    
    // 7. 업데이트된 잔여일수 확인
    const updatedBalance = await getLeaveBalance();
    expect(updatedBalance.annual).toBe(12);
  });
});
```

#### 4.2 급여 처리 전체 플로우
```javascript
// tests/e2e/payroll-processing-flow.test.js
describe('Payroll Processing Complete Flow', () => {
  test('Upload Excel → Calculate → Review → Save', async () => {
    // 1. Admin 로그인
    await loginAs('admin');
    
    // 2. Excel 파일 업로드
    const uploadResult = await uploadPayrollExcel('2025-08-payroll.xlsx');
    expect(uploadResult.processed).toBe(50);
    
    // 3. 계산 결과 검토
    const calculations = await getPayrollCalculations('2025-08');
    expect(calculations).toHaveLength(50);
    
    // 4. 저장
    await savePayroll('2025-08');
    
    // 5. 사용자 관점에서 확인
    await loginAs('user');
    const myPayroll = await getMyPayroll('2025-08');
    expect(myPayroll.net_salary).toBeGreaterThan(0);
  });
});
```

### Phase 5: CI/CD 통합 (1일)

#### GitHub Actions 설정
```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Backend Dependencies
        run: |
          cd backend
          npm ci
          
      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run Backend Tests
        run: |
          cd backend
          npm test -- --coverage
        env:
          MONGODB_URI: mongodb://localhost:27017/hr_test
          JWT_SECRET: test-secret
          
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm test -- --coverage
          
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info
```

## 📈 예상 커버리지

### Backend
- **Routes**: 80% (35개 엔드포인트)
- **Services**: 75% (비즈니스 로직)
- **Repositories**: 70% (DB 연산)
- **Middleware**: 90% (인증/권한)
- **총 테스트 수**: 약 100개

### Frontend
- **Components**: 70% (25개 컴포넌트)
- **Hooks**: 85% (useLeaveData, usePayrollData 등)
- **Utils**: 95% (dateUtils, formatters, validators)
- **Pages**: 60% (페이지 통합)
- **총 테스트 수**: 약 75개

## 🎯 성공 기준

### 필수 달성 목표
- [ ] 전체 테스트 커버리지 70% 이상
- [ ] 모든 핵심 API 엔드포인트 테스트
- [ ] 주요 사용자 시나리오 E2E 테스트
- [ ] CI/CD 파이프라인 통합
- [ ] 테스트 실행 시간 5분 이내

### 품질 지표
- [ ] 테스트 안정성: Flaky 테스트 5% 미만
- [ ] 테스트 유지보수: 월 평균 수정 10건 이하
- [ ] 버그 발견율: 프로덕션 버그 50% 감소

## 📅 일정

### 전체 소요 예상: 9일

| Phase | 작업 내용 | 예상 소요 | 담당 |
|-------|----------|----------|------|
| 1 | 테스트 환경 설정 | 2일 | - |
| 2 | Backend API 테스트 | 3일 | - |
| 3 | Frontend 컴포넌트 테스트 | 3일 | - |
| 4 | E2E 시나리오 테스트 | 2일 | - |
| 5 | CI/CD 통합 | 1일 | - |

## 🚨 리스크 및 대응

### 기술적 리스크
1. **MongoDB 테스트 환경**
   - 리스크: 실제 DB 사용 시 테스트 데이터 오염
   - 대응: 테스트 전용 DB 인스턴스 사용 (hr_test)
   - 각 테스트 후 데이터 클린업 스크립트 실행

2. **테스트 실행 시간**
   - 리스크: 테스트 증가로 실행 시간 증가
   - 대응: 병렬 실행, 선택적 테스트 실행

3. **Flaky 테스트**
   - 리스크: 비동기 처리로 인한 불안정한 테스트
   - 대응: waitFor, retry 로직 적용

### 조직적 리스크
1. **테스트 작성 부담**
   - 리스크: 개발 속도 저하
   - 대응: 점진적 도입, 핵심 기능 우선

2. **테스트 유지보수**
   - 리스크: 테스트 코드 관리 부담
   - 대응: 테스트 코드 리뷰, 정기적 리팩토링

## 📚 참고 자료

### 도구 문서
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/guide/)

### 베스트 프랙티스
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [React Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ✅ 체크리스트

### 시작 전
- [ ] 팀 동의 및 일정 확정
- [ ] 테스트 전략 리뷰
- [ ] 필요 패키지 버전 확인

### 구현 중
- [ ] Phase 1: 환경 설정 완료
- [ ] Phase 2: Backend 테스트 작성
- [ ] Phase 3: Frontend 테스트 작성
- [ ] Phase 4: E2E 테스트 작성
- [ ] Phase 5: CI/CD 통합

### 완료 후
- [ ] 테스트 커버리지 리포트
- [ ] 팀 교육 및 문서화
- [ ] 운영 프로세스 수립

## 🔄 업데이트 이력

- **2025.08.21**: 최초 작성
- **2025.08.21**: TDD 원칙 추가, 구체적인 테스트 목록 보완