# Team Status Refactoring Plan (TDD Approach)

## 목적
현재 `leaveCalendar.js`에 있는 팀/부서 관련 기능들을 별도의 `leaveTeamStatus.js` 파일로 분리하여 코드 구조를 개선

## TDD 사이클 적용

### Cycle 1: Team Status 라우트 테스트와 구현

#### 1.1 RED - 실패하는 테스트 작성
```javascript
// test-team-status-route.js
describe('Team Status Routes', () => {
  it('should return team members from /api/leave/team-status', async () => {
    const response = await request(app)
      .get('/api/leave/team-status')
      .set('Authorization', `Bearer ${token}`)
      .query({ year: 2025 });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.members).toBeDefined();
  });
});
```

#### 1.2 GREEN - 테스트 통과를 위한 최소 구현
1. `leaveTeamStatus.js` 파일 생성
2. 기본 라우트 구조만 구현
3. 테스트 통과 확인

#### 1.3 REFACTOR - 코드 개선
1. `leaveCalendar.js`에서 관련 코드 이동
2. Helper 함수 추출 및 정리
3. 테스트 재실행 확인

### Cycle 2: Department Stats 라우트 테스트와 구현

#### 2.1 RED - 실패하는 테스트 작성
```javascript
describe('Department Stats Routes', () => {
  it('should return department statistics with onLeave count', async () => {
    const response = await request(app)
      .get('/api/leave/team-status/department-stats')
      .set('Authorization', `Bearer ${token}`)
      .query({ year: 2025 });
    
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toHaveProperty('onLeave');
    expect(response.body.data[0].onLeave).toBeGreaterThanOrEqual(0);
  });
});
```

#### 2.2 GREEN - onLeave 필드 추가 구현
1. 현재 휴가중인 인원 계산 로직 추가
2. 테스트 통과 확인

#### 2.3 REFACTOR - 계산 로직 최적화
1. 데이터베이스 쿼리 최적화
2. 중복 코드 제거

### Cycle 3: Employee Log 라우트 테스트와 구현

#### 3.1 RED - 실패하는 테스트 작성
```javascript
describe('Employee Leave Log Routes', () => {
  it('should return employee leave log', async () => {
    const response = await request(app)
      .get('/api/leave/employee/testEmployeeId/log')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ year: 2025 });
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('totalAnnualLeave');
    expect(response.body.data).toHaveProperty('leaves');
  });
});
```

#### 3.2 GREEN - 라우트 이동 및 구현
1. `/:employeeId/log` 라우트를 `leaveTeamStatus.js`로 이동
2. 경로 매핑 수정
3. 테스트 통과 확인

#### 3.3 REFACTOR - 코드 정리
1. 불필요한 import 제거
2. 함수 정리

### Cycle 4: Frontend Integration 테스트와 수정

#### 4.1 RED - Frontend 통합 테스트 작성
```javascript
describe('Frontend API Integration', () => {
  it('should load department stats in UnifiedLeaveOverview', async () => {
    // Mock API response
    const mockStats = [
      { department: 'Dev', totalMembers: 5, onLeave: 1, avgLeaveUsage: 50, pendingRequests: 2 }
    ];
    
    // Test component rendering with data
    const { getByText } = render(<UnifiedLeaveOverview userRole="admin" />);
    await waitFor(() => {
      expect(getByText('현재 휴가중')).toBeInTheDocument();
      expect(getByText('1명')).toBeInTheDocument();
    });
  });
});
```

#### 4.2 GREEN - Frontend 경로 수정
1. API 경로 수정
2. 데이터 매핑 확인
3. 테스트 통과

#### 4.3 REFACTOR - 컴포넌트 최적화
1. 불필요한 상태 제거
2. 렌더링 최적화

## 각 사이클별 체크리스트

### Cycle 1 체크리스트 ✅
- [x] 테스트 작성 (RED)
- [x] 테스트 실행 및 실패 확인
- [x] 최소 코드 구현 (GREEN)
- [x] 테스트 통과 확인
- [x] 리팩토링 (REFACTOR)
- [x] 모든 테스트 재실행

### Cycle 2 체크리스트 ✅
- [x] 테스트 작성 (RED)
- [x] 테스트 실행 및 실패 확인
- [x] onLeave 계산 구현 (GREEN)
- [x] 테스트 통과 확인
- [x] 쿼리 최적화 (REFACTOR)
- [x] 모든 테스트 재실행

### Cycle 3 체크리스트 ✅
- [x] 테스트 작성 (RED)
- [x] 테스트 실행 및 실패 확인
- [x] 라우트 이동 구현 (GREEN)
- [x] 테스트 통과 확인
- [x] 코드 정리 (REFACTOR)
- [x] 모든 테스트 재실행

### Cycle 4 체크리스트
- [ ] Frontend 테스트 작성 (RED)
- [ ] 테스트 실행 및 실패 확인
- [ ] API 경로 수정 (GREEN)
- [ ] 테스트 통과 확인
- [ ] 컴포넌트 최적화 (REFACTOR)
- [ ] 모든 테스트 재실행

## 테스트 실행 명령어

```bash
# Backend 테스트
cd backend
npm test -- test-team-status-route.js

# Frontend 테스트
cd frontend
npm test -- UnifiedLeaveOverview.test.tsx

# 전체 테스트
npm test
```

## 예상 소요 시간 (TDD 방식)
- Cycle 1: 20분 (테스트 5분, 구현 10분, 리팩토링 5분)
- Cycle 2: 15분 (테스트 5분, 구현 7분, 리팩토링 3분)
- Cycle 3: 15분 (테스트 5분, 구현 7분, 리팩토링 3분)
- Cycle 4: 10분 (테스트 3분, 수정 5분, 최적화 2분)
- 총 예상: 60분

## TDD 원칙 준수 사항
1. **절대 테스트 없이 코드를 작성하지 않는다**
2. **실패하는 테스트를 먼저 확인한다**
3. **테스트를 통과하는 최소한의 코드만 작성한다**
4. **모든 테스트가 통과한 후에만 리팩토링한다**
5. **각 사이클 후 모든 테스트를 재실행한다**

## 주의사항
1. 각 사이클은 독립적으로 완료되어야 함
2. 테스트가 실패하면 다음 단계로 진행하지 않음
3. 리팩토링 중 테스트가 깨지면 즉시 롤백
4. 커밋은 각 GREEN 단계 후에만 수행 (테스트 통과 상태)