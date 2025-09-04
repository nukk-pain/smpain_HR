# REFACTOR-03 테스트 계획

## 테스트 목표
리팩토링된 6개 파일의 모든 기능이 정상 작동하는지 확인

## 테스트 준비 사항
- [ ] Frontend 개발 서버 실행 (`npm run dev`)
- [ ] Backend 서버 실행
- [ ] MongoDB 연결 확인

## Phase 1: TypeScript 컴파일 체크

### 1.1 빌드 테스트
```bash
cd frontend
npm run build-check  # TypeScript 체크
npm run build        # 실제 빌드
```

### 1.2 예상 오류 및 해결
- [ ] Import 경로 오류 수정
- [ ] Type 정의 누락 수정
- [ ] Props interface 불일치 수정

## Phase 2: 개별 컴포넌트 테스트

### 2.1 DepartmentManagement 테스트
**파일**: `DepartmentManagementRefactored.tsx`

#### 기능 테스트 체크리스트:
- [ ] 부서 목록 로딩 및 표시
- [ ] 부서 추가 다이얼로그 작동
- [ ] 부서 수정 기능
- [ ] 부서 삭제 기능
- [ ] Position 관리 탭 전환
- [ ] Position CRUD 작동
- [ ] 조직도 표시
- [ ] 부서별 직원 조회

#### 통합 위치:
```typescript
// 기존 import 교체
// import DepartmentManagement from './components/DepartmentManagement';
import DepartmentManagement from './components/DepartmentManagementRefactored';
```

### 2.2 API Services 테스트
**파일**: `apiRefactored.ts`

#### 기능 테스트 체크리스트:
- [ ] 로그인/로그아웃 API
- [ ] 사용자 조회 API
- [ ] 휴가 요청 API
- [ ] 급여 조회 API
- [ ] 부서 관리 API
- [ ] 문서 관리 API
- [ ] JWT 토큰 처리
- [ ] 에러 핸들링

#### 통합 위치:
```typescript
// src/services/api.ts를 백업하고
// apiRefactored.ts 내용으로 교체 또는
// import 경로 변경
```

### 2.3 LeaveCalendar 테스트
**파일**: `LeaveCalendarRefactored.tsx`

#### 기능 테스트 체크리스트:
- [ ] 달력 렌더링
- [ ] 월 네비게이션
- [ ] 휴가 이벤트 표시
- [ ] 날짜 클릭 시 상세 다이얼로그
- [ ] 부서 필터링
- [ ] 관리 모드 토글 (Admin)
- [ ] 예외 설정 추가/수정/삭제
- [ ] 범례 표시

#### 통합 위치:
```typescript
// import LeaveCalendar from './components/LeaveCalendar';
import LeaveCalendar from './components/LeaveCalendarRefactored';
```

### 2.4 PayrollExcelUploadWithPreview 테스트
**파일**: `PayrollExcelUploadWithPreviewRefactored.tsx`

#### 기능 테스트 체크리스트:
- [ ] 파일 드래그 앤 드롭
- [ ] Excel 파일 읽기
- [ ] 미리보기 테이블 표시
- [ ] 레코드 선택/해제
- [ ] 매칭되지 않은 레코드 처리
- [ ] 확인 다이얼로그
- [ ] 업로드 진행 상태
- [ ] 재시도 로직
- [ ] 결과 표시

### 2.5 PayslipBulkUpload 테스트
**파일**: `PayslipBulkUploadRefactored.tsx`

#### 기능 테스트 체크리스트:
- [ ] 다중 파일 업로드
- [ ] 파일 목록 표시
- [ ] 파일명 파싱 및 검증
- [ ] 직원 매칭 다이얼로그
- [ ] 업로드 이력 표시
- [ ] 업로드 요약 통계
- [ ] 상태 업데이트
- [ ] 에러 처리

### 2.6 LeaveManagement 테스트
**파일**: `LeaveManagementRefactored.tsx`

#### 기능 테스트 체크리스트:
- [ ] 휴가 잔액 카드 표시
- [ ] 휴가 신청 다이얼로그
- [ ] 휴가 요청 테이블
- [ ] 휴가 취소 기능
- [ ] 승인/거절 처리
- [ ] 날짜 계산 로직
- [ ] 검증 규칙 적용

## Phase 3: 통합 테스트

### 3.1 페이지 라우팅 테스트
- [ ] 각 페이지 접근 가능
- [ ] 권한별 접근 제어
- [ ] 404 처리

### 3.2 데이터 흐름 테스트
- [ ] Frontend → API → Backend → DB
- [ ] 응답 데이터 렌더링
- [ ] 에러 상태 처리
- [ ] 로딩 상태 처리

### 3.3 성능 테스트
- [ ] 초기 로딩 시간
- [ ] API 응답 시간
- [ ] 메모리 사용량
- [ ] 번들 크기 비교

## Phase 4: 회귀 테스트

### 4.1 기존 기능 확인
- [ ] 모든 기존 기능 정상 작동
- [ ] UI/UX 변경 없음
- [ ] 데이터 무결성 유지

### 4.2 브라우저 호환성
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## 테스트 실행 순서

1. **TypeScript 컴파일 체크** (필수)
   - 오류 없이 빌드되어야 함

2. **개별 컴포넌트 단위 테스트**
   - 각 컴포넌트를 하나씩 교체하며 테스트
   - 문제 발생 시 즉시 수정

3. **통합 테스트**
   - 모든 컴포넌트 교체 후 전체 동작 확인

4. **회귀 테스트**
   - 기존 기능 영향 확인

## 롤백 계획

문제 발생 시:
1. Git으로 이전 버전 복구
2. 리팩토링된 파일을 기존 파일로 교체
3. 문제 분석 후 재시도

## 테스트 결과 기록

### 성공한 테스트:
- [ ] 

### 실패한 테스트:
- [ ] 

### 수정 사항:
- [ ] 

## 최종 확인 사항

- [ ] 모든 테스트 통과
- [ ] 성능 개선 확인
- [ ] 코드 가독성 향상 확인
- [ ] 문서 업데이트 완료