# Team Status Refactoring Plan

## 목적
현재 `leaveCalendar.js`에 있는 팀/부서 관련 기능들을 별도의 `leaveTeamStatus.js` 파일로 분리하여 코드 구조를 개선

## 현재 문제점
1. 팀 현황과 부서 통계가 캘린더 파일에 잘못 위치
2. 파일명과 기능이 불일치
3. 부서 통계 탭에서 데이터가 표시되지 않음

## 리팩토링 계획

### Phase 1: 새 파일 생성 및 코드 이동
1. **새 파일 생성**: `/backend/routes/leave/leaveTeamStatus.js`
2. **이동할 라우트들**:
   - `GET /` - 팀 멤버 현황 (현재 team-status로 호출)
   - `GET /department-stats` - 부서별 통계
   - `GET /:employeeId/log` - 직원별 상세 로그

3. **Helper 함수 이동**:
   - 휴가 잔여일 계산 로직
   - 사용률 계산 로직
   - 부서별 집계 로직

### Phase 2: 라우터 연결 수정
1. **`/backend/routes/leave/index.js` 수정**:
   ```javascript
   const leaveTeamStatusRouter = require('./leaveTeamStatus');
   
   // 기존 leaveCalendarRouter 대신
   router.use('/team-status', leaveTeamStatusRouter);
   router.use('/department-stats', leaveTeamStatusRouter);
   ```

2. **기존 라우트 정리**:
   - `/team-calendar`는 그대로 `leaveCalendarRouter` 유지
   - `/calendar`는 그대로 `leaveCalendarRouter` 유지
   - `/employee`는 `leaveTeamStatusRouter`로 이동

### Phase 3: Backend API 구조 개선
1. **부서 통계 응답 필드 수정**:
   ```javascript
   {
     department: string,
     totalMembers: number,
     onLeave: number,        // 추가 필요
     avgLeaveUsage: number,
     pendingRequests: number
   }
   ```

2. **현재 휴가중인 인원 계산 로직 추가**:
   - 오늘 날짜 기준으로 휴가 중인 직원 수 계산
   - 승인된 휴가만 포함

### Phase 4: Frontend 경로 수정
1. **`UnifiedLeaveOverview.tsx` 수정**:
   - 부서 통계 API 경로: `/leave/department-stats` (team-status 제거)
   - 팀 현황 API 경로: `/leave/team-status` (유지)

### Phase 5: 테스트 및 검증
1. **기능 테스트**:
   - [ ] 팀 현황 탭 - 개별 팀원 카드 표시
   - [ ] 부서 통계 탭 - 부서별 통계 표시
   - [ ] 직원 상세 보기 - 휴가 이력 조회

2. **데이터 검증**:
   - [ ] 휴가 사용률 계산 정확성
   - [ ] 현재 휴가중 인원 수 정확성
   - [ ] 대기중 요청 수 정확성

## 예상 파일 구조

```
/backend/routes/leave/
├── index.js              # 라우터 매핑
├── leaveRequests.js      # 휴가 신청 CRUD
├── leaveBalance.js       # 휴가 잔액 관리
├── leaveApproval.js      # 휴가 승인 관리
├── leaveCancellation.js  # 휴가 취소 관리
├── leaveCalendar.js      # 캘린더 뷰 (순수 캘린더만)
├── leaveTeamStatus.js    # ✨ NEW: 팀/부서 현황
└── leaveExceptions.js    # 예외 처리
```

## 예상 소요 시간
- 코드 리팩토링: 30분
- 테스트 및 디버깅: 20분
- 총 예상: 50분

## 주의사항
1. 기존 API 경로 변경 시 Frontend 동시 수정 필요
2. Helper 함수 중복 제거 필요
3. 데이터베이스 쿼리 최적화 기회 활용