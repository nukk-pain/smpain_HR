# 휴가 관리 시스템 요구사항

## 📋 개요

본 문서는 휴가 관리 시스템의 포괄적인 기능 요구사항을 정의합니다. 현재 기본적인 데이터 구조와 일부 API는 구현되어 있으나, 완전한 사용자 인터페이스와 워크플로우가 필요합니다.

## 🎯 핵심 목표

- **사용자 친화적인** 휴가 신청 시스템
- **효율적인** 관리자 승인 워크플로우
- **투명한** 휴가 잔여일수 관리
- **포괄적인** 휴가 현황 대시보드

## 🏗️ 현재 상태 분석

### ✅ 구현된 기능
- 기본 데이터베이스 스키마 (`leaveRequests`, `leave_logs`)
- 연차 계산 로직 (15일 + 근속년수, 최대 25일)
- 기본 통계 API (`/api/leave/stats/overview`)
- 역할 기반 데이터 접근 제어

### ❌ 미구현 기능
- 휴가 신청 사용자 인터페이스
- 관리자 승인/거부 인터페이스
- 휴가 잔여일수 표시
- 휴가 달력 및 현황 보기
- 완전한 CRUD API 엔드포인트

---

## 🔧 구현 필요 기능

### 1. 사용자 기능 (User Features)

#### 1.1 휴가 신청 (Leave Request)
- **기능**: 새로운 휴가 신청서 작성
- **입력 항목**:
  - 휴가 종류 (연차, 경조사)
  - 시작일 / 종료일
  - 휴가 일수 (자동 계산)
  - 신청 사유
  - 대체 인력 정보
- **검증 로직**:
  - 잔여 연차 확인
  - 중복 신청 방지
  - 과거 날짜 신청 제한
  - 최소 사전 신청 기간 확인

#### 1.2 내 휴가 현황 (My Leave Status)
- **휴가 잔여일수**: 
  - 총 연차일수
  - 사용된 연차일수
  - 남은 연차일수
  - 진행중인 신청 일수
- **신청 내역**:
  - 대기중/승인됨/거부됨 상태별 필터링
  - 날짜별 정렬
  - 상세 정보 조회

#### 1.3 팀 휴가 달력 (Team Leave Calendar)
- **월별 달력**: 개인 휴가 일정 표시
- **팀 달력**: 같은 부서 휴가 현황 확인
- **휴일 표시**: 공휴일 및 회사 휴무일

### 2. 관리자 기능 (Manager Features)

#### 2.1 휴가 승인 관리 (Leave Approval)
- **대기중인 신청**: 담당 부서 직원 승인 대기 목록
- **승인/거부**: 
  - 한 번에 여러 건 처리
  - 승인/거부 사유 입력
  - 조건부 승인 (날짜 변경 요청)
- **알림 시스템**: 신청자에게 결과 통보

#### 2.2 부서 휴가 현황 (Department Leave Status)
- **부서별 휴가 통계**: 
  - 부서 직원 휴가 사용률
  - 평균 휴가 일수
  - 휴가 승인률
- **일정 조정**: 
  - 동시 휴가 제한 확인
  - 업무 연속성 관리

#### 2.3 기본 휴가 정책 설정 (Basic Leave Policy)
- **특별 기간**: 2명 이상 휴가 신청할 수 있는 날 설정
- **성수기 제한**: 부서별 휴가 제한 설정
- **경조사 승인**: 특별 휴가 승인 권한

### 3. 원장 기능 (Admin Features)

#### 3.1 전사 휴가 통계 (Company-wide Statistics)
- **전체 통계 대시보드**: 
  - 모든 부서 휴가 사용률 비교
  - 전사 평균 휴가 일수
  - 부서별 휴가 승인률
- **기간별 분석**:
  - 월별/분기별/연도별 트렌드
  - 성수기 휴가 집중도 분석
  - 휴가 미사용 현황 모니터링

#### 3.2 휴가 정책 전체 관리 (Complete Leave Policy Management)
- **연차 계산 규칙**: 
  - 기본 연차일수 설정 (1년차: 11일, 2년차 이상: 15일)
  - 근속년수별 추가 연차 규칙
  - 최대 연차일수 제한 (25일)
- **휴가 종류 관리**:
  - 연차, 병가, 경조사, 개인휴가 규칙 설정
  - 각 휴가별 승인 프로세스 정의
  - 유/무급 휴가 구분 설정

#### 3.3 시스템 관리 기능 (System Management)
- **일괄 처리 기능**:
  - 연도말 미사용 연차 이월/소멸 처리
  - 신규 입사자 연차 일할 계산
  - 퇴사자 연차 정산 처리
- **전체 승인 권한**: 모든 휴가 신청 최종 승인/거부
- **시스템 설정**: 휴가 관련 모든 정책 및 규칙 설정

---

## 🎨 사용자 인터페이스 요구사항

### 1. 휴가 신청 폼 (Leave Request Form)
```
┌─────────────────────────────────────┐
│ 🏖️ 휴가 신청                        │
├─────────────────────────────────────┤
│ 휴가 종류: [연차 ▼]                 │
│ 시작일:   [2024-01-15 📅]           │
│ 종료일:   [2024-01-17 📅]           │
│ 휴가 일수: 3일 (자동계산)            │
│ 신청 사유: [개인사정으로 인한...]    │
│ 대체 인력: [김철수]                 │
│                                     │
│ 💡 현재 잔여 연차: 18일             │
│ 💡 신청 후 잔여: 15일               │
│                                     │
│ [취소] [임시저장] [신청하기]        │
└─────────────────────────────────────┘
```

### 2. 휴가 현황 대시보드 (Leave Dashboard)
```
┌─────────────────────────────────────┐
│ 📊 내 휴가 현황 (2024년)            │
├─────────────────────────────────────┤
│ 총 연차: 15일 │ 사용: 5일 │ 잔여: 10일│
│ ████████████░░░░░░░░░░░░░ 25%       │
├─────────────────────────────────────┤
│ 📋 최근 신청 내역                   │
│ • 2024-01-15~17 (3일) ✅ 승인됨    │
│ • 2024-02-05~05 (1일) ⏳ 대기중    │
│ • 2024-02-20~21 (2일) ❌ 거부됨    │
└─────────────────────────────────────┘
```

### 3. 관리자 승인 화면 (Manager Approval)
```
┌─────────────────────────────────────┐
│ ✅ 휴가 승인 관리                   │
├─────────────────────────────────────┤
│ 📋 승인 대기 (3건)                  │
│                                     │
│ 🔘 김민수 | 연차 | 2024-01-20~22    │
│     사유: 개인사정으로 인한 휴가    │
│     [승인] [거부] [상세보기]        │
│                                     │
│ 🔘 이영희 | 병가 | 2024-01-18       │
│     사유: 몸살감기로 인한 병가      │
│     [승인] [거부] [상세보기]        │
│                                     │
│ [일괄승인] [선택승인]               │
└─────────────────────────────────────┘
```

---

## 🔗 API 엔드포인트 설계

### 1. 휴가 신청 관련 API

#### 1.1 휴가 신청 CRUD
```http
POST   /api/leave                    # 휴가 신청 생성
GET    /api/leave                    # 휴가 신청 목록 조회
GET    /api/leave/:id                # 특정 휴가 신청 조회
PUT    /api/leave/:id                # 휴가 신청 수정
DELETE /api/leave/:id                # 휴가 신청 취소
```

#### 1.2 휴가 승인 관리
```http
POST   /api/leave/:id/approve        # 휴가 승인/거부
POST   /api/leave/bulk-approve       # 일괄 승인/거부
GET    /api/leave/pending            # 승인 대기 목록
```

#### 1.3 휴가 잔여일수 및 통계
```http
GET    /api/leave/balance            # 내 휴가 잔여일수
GET    /api/leave/balance/:userId    # 특정 사용자 잔여일수
GET    /api/leave/calendar/:month    # 월별 휴가 달력
GET    /api/leave/team-status        # 팀 휴가 현황
```

### 2. 요청/응답 데이터 구조

#### 2.1 휴가 신청 데이터
```json
{
  "_id": "objectId",
  "userId": "objectId",
  "leaveType": "annual|sick|personal|maternity",
  "startDate": "2024-01-15",
  "endDate": "2024-01-17",
  "daysCount": 3,
  "reason": "개인사정으로 인한 휴가",
  "substituteEmployee": "김철수",
  "status": "pending|approved|rejected",
  "approvedBy": "objectId",
  "approvedAt": "2024-01-10T09:00:00Z",
  "approvalComment": "승인 사유",
  "createdAt": "2024-01-08T14:30:00Z",
  "updatedAt": "2024-01-10T09:00:00Z"
}
```

#### 2.2 휴가 잔여일수 데이터
```json
{
  "userId": "objectId",
  "year": 2024,
  "totalAnnualLeave": 15,
  "usedAnnualLeave": 5,
  "pendingAnnualLeave": 2,
  "remainingAnnualLeave": 13,
  "carryOverFromPreviousYear": 0,
  "breakdown": {
    "annual": { "total": 15, "used": 5, "remaining": 10 },
    "sick": { "total": 12, "used": 2, "remaining": 10 },
    "personal": { "total": 3, "used": 1, "remaining": 2 }
  }
}
```

---

## 🎯 비즈니스 로직 요구사항

### 1. 휴가 계산 규칙

#### 1.1 연차 계산
- **1년차**: 11일 (입사 첫 해)
- **2년차 이상**: 15일 + 근속년수-1 (2년차부터)
- **최대 연차**: 25일
- **일할 계산**: 월 중 입사시 해당 월부터 일할 계산

#### 1.2 휴가 종류별 규칙
```
연차 휴가 (Annual Leave):
- 1년차: 11일, 2년차 이상: 15일 + 근속년수-1 (최대 25일)
- 전년도 미사용 연차 5일까지 이월 가능
- 사전 신청 필수 (최소 3일 전)

경조사 휴가 (Family Event):
- 사유 적어내면 부서장 승인 하에 진행 가능

개인 휴가 (Personal Leave):
- 연간 3일 무급
- 긴급 상황시 사용
```

### 2. 승인 워크플로우

#### 2.1 승인 단계
```
1. 사용자(user) 휴가 신청
2. 관리자(manager) 1차 승인/거부
3. 원장(admin) 최종 확인 및 승인
```

#### 2.2 역할별 승인 권한
- **사용자**: 휴가 신청만 가능
- **관리자**: 담당 부서 직원 휴가 1차 승인/거부
- **원장**: 모든 휴가 신청 최종 승인/거부 및 시스템 정책 관리

### 3. 제한 사항

#### 3.1 동시 휴가 제한
- 하루에 한 명만 휴가 신청 가능
- 관리자가 지정한 날에는 2명 이상 휴가 신청 가능

---

---

## 🗓️ 구현 우선순위

### Phase 1: 기본 기능 (필수) - ✅ 완료
1. ✅ 사용자 휴가 신청 폼 구현
2. ✅ 내 휴가 현황 페이지 (사용자용)
3. ✅ 관리자 승인 인터페이스 (관리자/원장용)
4. ✅ 3단계 역할별 권한 관리 (user/manager/admin)
5. ✅ 기본 API 엔드포인트

### Phase 2: 고급 기능 (중요)
1. 🔄 휴가 달력 뷰
2. 🔄 팀 휴가 현황
3. 🔄 통계 및 리포팅
4. 🔄 알림 시스템

### Phase 3: 추가 기능 (선택)
1. ⭐ 모바일 최적화
2. ⭐ 외부 시스템 연동
3. ⭐ AI 기능 및 자동화
4. ⭐ 고급 분석 기능

---

## 🔧 기술적 고려사항

### 1. 데이터베이스 최적화
- 인덱스 설정: `userId`, `status`, `startDate`
- 복합 인덱스: `userId + status + year`
- 아카이브 정책: 3년 이상 된 데이터 별도 보관

### 2. 성능 최적화
- 캐싱: 휴가 잔여일수 Redis 캐시
- 페이지네이션: 대용량 휴가 내역 처리
- 지연 로딩: 상세 정보 필요시에만 로드

### 3. 보안 고려사항
- 권한 검증: 본인 및 관리 권한 내 데이터만 접근
- 데이터 검증: 날짜 유효성, 잔여일수 확인
- 감사 로그: 모든 휴가 관련 활동 기록

### 4. 확장성
- 마이크로서비스: 휴가 관리 독립 서비스화
- 이벤트 기반: 휴가 상태 변경시 이벤트 발행
- API Gateway: 외부 시스템 연동 대비

---

## 📋 체크리스트

### 개발 완료 기준
- [ ] 휴가 신청 폼 완전 동작
- [ ] 관리자 승인 프로세스 완전 동작
- [ ] 휴가 잔여일수 정확 계산
- [ ] 모든 API 엔드포인트 구현
- [ ] 단위 테스트 작성 완료
- [ ] 통합 테스트 통과
- [ ] 사용자 가이드 작성
- [ ] 관리자 매뉴얼 작성

### 배포 준비 사항
- [ ] 프로덕션 데이터베이스 스키마 업데이트
- [ ] 기존 데이터 마이그레이션 스크립트
- [ ] 성능 테스트 완료
- [ ] 보안 검증 완료
- [ ] 백업 및 복구 절차 수립
- [ ] 모니터링 및 알림 설정

---

*이 문서는 휴가 관리 시스템의 포괄적인 요구사항을 담고 있으며, 개발 진행에 따라 지속적으로 업데이트됩니다.*