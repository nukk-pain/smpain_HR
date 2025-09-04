# TEST-02: 최근 구현 기능 통합 테스트 계획

**생성일**: 2025년 09월 04일  
**상태**: 진행 중  
**우선순위**: HIGH  
**예상 소요**: 2일  

## 📋 테스트 대상 기능

### 1. FEAT-07: 급여 기능 접근 권한 제한
- Admin 전용 급여 API 접근 테스트
- Supervisor 권한으로 급여 접근 차단 확인
- Frontend 라우트 보호 테스트

### 2. FEAT-06: 프론트엔드 리프레시 토큰 통합
- 토큰 만료 시 자동 갱신 테스트
- 동시 401 응답 처리 테스트
- 토큰 매니저 저장/조회 테스트

### 3. FEAT-05: 급여 관리 개선
- 매출-인센티브 자동 계산 테스트
- 일용직 급여 CRUD 테스트
- 인센티브 복사 기능 테스트

### 4. REFACTOR-10: 권한/CORS/로깅 일원화
- 중앙집중식 권한 미들웨어 테스트
- CORS 헤더 설정 테스트
- 로깅 민감정보 마스킹 테스트

## 🧪 테스트 구현 계획 (TDD)

### Phase 1: Backend API 테스트 (Day 1 - 오전)

#### [ ] 1.1 급여 권한 제한 테스트
```javascript
// backend/tests/integration/payroll-access.test.js
describe('Payroll Access Control', () => {
  // Test 1: Admin can access all payroll endpoints
  test('Admin should access payroll endpoints', async () => {
    // RED: Write failing test
    // GREEN: Verify existing implementation
    // REFACTOR: Clean up test code
  });

  // Test 2: Supervisor cannot access payroll endpoints  
  test('Supervisor should be blocked from payroll', async () => {
    // RED: Write test expecting 403
    // GREEN: Verify permission middleware blocks
    // REFACTOR: Consolidate test helpers
  });

  // Test 3: User cannot access payroll endpoints
  test('User should be blocked from payroll', async () => {
    // RED: Write test expecting 403
    // GREEN: Verify permission blocks
    // REFACTOR: Extract common assertions
  });
});
```

#### [ ] 1.2 리프레시 토큰 테스트
```javascript
// backend/tests/integration/auth-refresh.test.js
describe('Refresh Token Flow', () => {
  // Test 1: Valid refresh token returns new access token
  test('Should refresh valid token', async () => {
    // RED: Test token refresh endpoint
    // GREEN: Verify new tokens returned
    // REFACTOR: Extract token helpers
  });

  // Test 2: Invalid refresh token returns 401
  test('Should reject invalid refresh token', async () => {
    // RED: Test with bad token
    // GREEN: Verify 401 response
    // REFACTOR: Consolidate error checks
  });

  // Test 3: Expired refresh token handling
  test('Should handle expired refresh token', async () => {
    // RED: Test with expired token
    // GREEN: Verify proper error
    // REFACTOR: Clean up test data
  });
});
```

#### [ ] 1.3 일용직 급여 CRUD 테스트
```javascript
// backend/tests/integration/daily-workers.test.js
describe('Daily Workers Management', () => {
  // Test 1: Create daily worker record
  test('Should create daily worker', async () => {
    // RED: Test POST endpoint
    // GREEN: Verify creation
    // REFACTOR: Extract test fixtures
  });

  // Test 2: Read daily worker records
  test('Should list daily workers by month', async () => {
    // RED: Test GET endpoint
    // GREEN: Verify listing
    // REFACTOR: Optimize queries
  });

  // Test 3: Update daily worker
  test('Should update daily worker', async () => {
    // RED: Test PUT endpoint
    // GREEN: Verify update
    // REFACTOR: Validate fields
  });

  // Test 4: Delete daily worker
  test('Should delete daily worker', async () => {
    // RED: Test DELETE endpoint
    // GREEN: Verify deletion
    // REFACTOR: Add soft delete
  });
});
```

#### [ ] 1.4 인센티브 계산 테스트
```javascript
// backend/tests/integration/incentive-calculation.test.js
describe('Incentive Calculation', () => {
  // Test 1: Calculate incentives from sales data
  test('Should calculate incentives correctly', async () => {
    // RED: Test calculation logic
    // GREEN: Verify formulas
    // REFACTOR: Extract calculation
  });

  // Test 2: Round up to nearest 1000
  test('Should round incentives to 1000', async () => {
    // RED: Test rounding
    // GREEN: Verify Math.ceil
    // REFACTOR: Create utility
  });

  // Test 3: Bulk incentive calculation
  test('Should process bulk sales data', async () => {
    // RED: Test bulk endpoint
    // GREEN: Verify batch processing
    // REFACTOR: Optimize performance
  });
});
```

### Phase 2: Frontend Integration 테스트 (Day 1 - 오후)

#### [ ] 2.1 Frontend 권한 라우팅 테스트
```javascript
// frontend/tests/integration/route-protection.test.tsx
describe('Route Protection', () => {
  // Test 1: Admin can access payroll routes
  test('Admin accesses /payroll/*', async () => {
    // RED: Mock admin user
    // GREEN: Verify route access
    // REFACTOR: Extract auth mocks
  });

  // Test 2: Supervisor blocked from payroll
  test('Supervisor blocked from /payroll/*', async () => {
    // RED: Mock supervisor
    // GREEN: Verify redirect
    // REFACTOR: Consolidate tests
  });

  // Test 3: Menu items filtered by role
  test('Menu shows correct items per role', async () => {
    // RED: Test menu rendering
    // GREEN: Verify item visibility
    // REFACTOR: Extract menu tests
  });
});
```

#### [ ] 2.2 Axios 인터셉터 테스트
```javascript
// frontend/tests/integration/axios-interceptor.test.ts
describe('Axios Token Interceptor', () => {
  // Test 1: Auto refresh on 401
  test('Should auto-refresh on 401', async () => {
    // RED: Mock 401 response
    // GREEN: Verify retry with new token
    // REFACTOR: Extract mock server
  });

  // Test 2: Queue concurrent 401 requests
  test('Should queue concurrent 401s', async () => {
    // RED: Mock multiple 401s
    // GREEN: Verify single refresh
    // REFACTOR: Optimize queue logic
  });

  // Test 3: Fail after refresh fails
  test('Should logout when refresh fails', async () => {
    // RED: Mock refresh failure
    // GREEN: Verify logout
    // REFACTOR: Clean up state
  });
});
```

#### [ ] 2.3 일용직 관리 UI 테스트
```javascript
// frontend/tests/integration/daily-worker-ui.test.tsx
describe('Daily Worker Management UI', () => {
  // Test 1: Display daily workers table
  test('Should display workers table', async () => {
    // RED: Render component
    // GREEN: Verify table data
    // REFACTOR: Extract table tests
  });

  // Test 2: Add new daily worker
  test('Should add new worker', async () => {
    // RED: Test form submission
    // GREEN: Verify API call
    // REFACTOR: Form validation
  });

  // Test 3: Edit daily worker
  test('Should edit worker', async () => {
    // RED: Test edit dialog
    // GREEN: Verify update
    // REFACTOR: Reuse forms
  });

  // Test 4: Delete daily worker
  test('Should delete worker', async () => {
    // RED: Test delete button
    // GREEN: Verify removal
    // REFACTOR: Add confirmation
  });
});
```

### Phase 3: E2E 시나리오 테스트 (Day 2 - 오전)

#### [ ] 3.1 완전한 급여 워크플로우
```javascript
// e2e/tests/payroll-workflow.spec.js
describe('Complete Payroll Workflow', () => {
  // Test 1: Admin login and access payroll
  test('Admin completes payroll workflow', async () => {
    // 1. Login as admin
    // 2. Navigate to payroll
    // 3. Upload Excel data
    // 4. Review calculations
    // 5. Generate payslips
    // 6. Verify PDF generation
  });

  // Test 2: Supervisor attempts payroll access
  test('Supervisor blocked from payroll', async () => {
    // 1. Login as supervisor
    // 2. Attempt payroll access
    // 3. Verify 403 error
    // 4. Check redirect to dashboard
  });
});
```

#### [ ] 3.2 토큰 갱신 실제 시나리오
```javascript
// e2e/tests/token-refresh.spec.js
describe('Token Refresh Scenario', () => {
  // Test 1: Long session with refresh
  test('Session continues after token expiry', async () => {
    // 1. Login and get tokens
    // 2. Wait for access token expiry
    // 3. Make API request
    // 4. Verify auto-refresh
    // 5. Continue using app
  });

  // Test 2: Multiple tabs token sync
  test('Tokens sync across tabs', async () => {
    // 1. Open multiple tabs
    // 2. Login in one tab
    // 3. Verify tokens in all tabs
    // 4. Refresh in one tab
    // 5. Verify update in all tabs
  });
});
```

#### [ ] 3.3 일용직 + 정규직 통합 급여
```javascript
// e2e/tests/integrated-payroll.spec.js
describe('Integrated Payroll Management', () => {
  // Test 1: Calculate total payroll
  test('Calculate combined payroll', async () => {
    // 1. Add regular employees
    // 2. Add daily workers
    // 3. Calculate incentives
    // 4. Verify total amounts
    // 5. Generate reports
  });

  // Test 2: Month-end processing
  test('Process month-end payroll', async () => {
    // 1. Close current month
    // 2. Generate all payslips
    // 3. Export to Excel
    // 4. Verify completeness
    // 5. Archive data
  });
});
```

### Phase 4: 성능 및 보안 테스트 (Day 2 - 오후)

#### [ ] 4.1 로깅 보안 테스트
```javascript
// backend/tests/security/logging.test.js
describe('Logging Security', () => {
  // Test 1: Mask sensitive data
  test('Should mask passwords in logs', async () => {
    // RED: Log with password
    // GREEN: Verify masking
    // REFACTOR: Add patterns
  });

  // Test 2: Hide JWT tokens
  test('Should mask JWT tokens', async () => {
    // RED: Log with token
    // GREEN: Verify hiding
    // REFACTOR: Improve regex
  });

  // Test 3: Protect MongoDB URIs
  test('Should mask MongoDB URIs', async () => {
    // RED: Log connection string
    // GREEN: Verify protection
    // REFACTOR: Add more cases
  });
});
```

#### [ ] 4.2 CORS 설정 테스트
```javascript
// backend/tests/security/cors.test.js
describe('CORS Configuration', () => {
  // Test 1: Allow configured origins
  test('Should allow Vercel origin', async () => {
    // RED: Test CORS headers
    // GREEN: Verify allowed
    // REFACTOR: Dynamic origins
  });

  // Test 2: Block unauthorized origins
  test('Should block unknown origins', async () => {
    // RED: Test bad origin
    // GREEN: Verify blocked
    // REFACTOR: Whitelist logic
  });

  // Test 3: Handle preflight requests
  test('Should handle OPTIONS requests', async () => {
    // RED: Send OPTIONS
    // GREEN: Verify headers
    // REFACTOR: Cache control
  });
});
```

#### [ ] 4.3 성능 벤치마크
```javascript
// tests/performance/benchmarks.test.js
describe('Performance Benchmarks', () => {
  // Test 1: API response times
  test('API responds within 200ms', async () => {
    // Measure response times
    // Verify under threshold
    // Log performance metrics
  });

  // Test 2: Bulk data handling
  test('Handle 1000+ records', async () => {
    // Test with large dataset
    // Verify memory usage
    // Check pagination works
  });

  // Test 3: Concurrent user load
  test('Handle 50 concurrent users', async () => {
    // Simulate concurrent requests
    // Verify system stability
    // Check error rates
  });
});
```

## 📊 테스트 커버리지 목표

- **Backend API**: 90% 이상
- **Frontend Components**: 80% 이상
- **E2E Scenarios**: 핵심 워크플로우 100%
- **Security Tests**: 모든 엔드포인트 검증

## 🚀 실행 계획

### Day 1 (2025년 09월 04일)
- [ ] 오전: Backend API 테스트 구현 (1.1 ~ 1.4)
- [ ] 오후: Frontend Integration 테스트 (2.1 ~ 2.3)
- [ ] 저녁: 테스트 결과 검토 및 수정

### Day 2 (2025년 09월 05일)
- [ ] 오전: E2E 시나리오 테스트 (3.1 ~ 3.3)
- [ ] 오후: 성능 및 보안 테스트 (4.1 ~ 4.3)
- [ ] 저녁: 최종 리포트 작성

## 🎯 성공 기준

1. **모든 테스트 통과**: 100% 그린
2. **버그 발견 및 수정**: 최소 5개 이상
3. **성능 개선**: 응답 시간 10% 단축
4. **보안 강화**: 모든 민감정보 마스킹
5. **문서화**: 테스트 가이드 업데이트

## 📝 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 기존 코드 버그 발견 | HIGH | 즉시 수정 후 테스트 재실행 |
| 테스트 환경 설정 복잡 | MEDIUM | Docker 컨테이너 활용 |
| E2E 테스트 불안정 | MEDIUM | Retry 로직 추가 |
| 시간 부족 | LOW | 핵심 테스트 우선 구현 |

## 🔄 다음 단계

1. 모든 테스트 통과 확인
2. 테스트 결과 리포트 작성
3. CI/CD 파이프라인 통합
4. DEPLOY-01 진행 준비

---

**Note**: 모든 테스트는 TDD 방식으로 진행하며, RED → GREEN → REFACTOR 사이클을 엄격히 준수합니다.