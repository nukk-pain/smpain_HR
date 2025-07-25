# Backend-Frontend API 일관성 검증 및 수정 계획

## 🎯 목표

Frontend와 Backend 간의 API 엔드포인트, 변수명, 필드명, 데이터 구조 불일치를 체계적으로 찾아내고 수정하여 완전한 일관성을 확보합니다.

## 🔍 분석 접근법

### Phase 1: 전체 API 인벤토리 생성 (2시간)

#### 1.1 Backend API 엔드포인트 추출
```bash
# 모든 라우터 파일에서 API 엔드포인트 추출
grep -r "router\.\(get\|post\|put\|delete\)" backend/routes/ > backend_apis.txt
grep -r "app\.\(get\|post\|put\|delete\)" backend/ >> backend_apis.txt
```

**추출할 정보:**
- HTTP 메소드 (GET, POST, PUT, DELETE)
- URL 패턴 (`/api/users`, `/api/leave/:id`)
- 요청 바디 필드
- 응답 데이터 구조
- 쿼리 파라미터

#### 1.2 Frontend API 호출 추출
```bash
# 모든 TypeScript 파일에서 API 호출 추출
grep -r "apiService\." frontend/src/ > frontend_apis.txt
grep -r "axios\." frontend/src/ >> frontend_apis.txt
grep -r "fetch(" frontend/src/ >> frontend_apis.txt
```

**추출할 정보:**
- API 호출 메소드명
- 전달하는 데이터 구조
- 기대하는 응답 구조
- 타입 정의

### Phase 2: 데이터 구조 분석 (1.5시간)

#### 2.1 TypeScript 인터페이스 분석
```typescript
// frontend/src/types/index.ts 분석
interface User {
  _id: string;
  name: string;
  // ... 모든 필드 매핑
}
```

#### 2.2 Backend 데이터 모델 분석
```javascript
// 실제 데이터베이스 스키마와 API 응답 구조 분석
const user = {
  _id: ObjectId,
  name: string,
  // ... 모든 필드 매핑
}
```

#### 2.3 불일치 패턴 식별
- **필드명 불일치**: `id` vs `_id`
- **타입 불일치**: `string` vs `number`
- **구조 불일치**: 중첩 객체 vs 평면 객체
- **null/undefined 처리**: 기본값 차이

### Phase 3: 자동화된 불일치 검출 (1시간)

#### 3.1 API 매칭 스크립트 작성
```javascript
// check-api-consistency.js
const backendApis = parseBackendRoutes();
const frontendCalls = parseFrontendCalls();
const mismatches = findMismatches(backendApis, frontendCalls);
```

**검출할 불일치:**
- 존재하지 않는 엔드포인트 호출
- URL 패턴 차이
- HTTP 메소드 불일치
- 필수 파라미터 누락

#### 3.2 데이터 구조 검증 스크립트
```javascript
// check-data-consistency.js
const typeDefinitions = parseTypeScript();
const apiResponses = parseBackendResponses();
const fieldMismatches = compareDataStructures();
```

### Phase 4: 수정 우선순위 결정 (30분)

#### 4.1 중요도 분류
**🔴 Critical (즉시 수정 필요)**
- 런타임 오류 발생
- 핵심 기능 동작 불가
- 데이터 손실 위험

**🟡 Important (빠른 수정 권장)**
- 기능 일부 제한
- 사용자 경험 저하
- 타입 안전성 부족

**🟢 Minor (점진적 수정)**
- 코드 가독성 문제
- 일관성 부족
- 최적화 기회

#### 4.2 영향도 분석
- **사용자 인터페이스**: 사용자 직접 영향
- **관리자 기능**: 시스템 관리 영향
- **데이터 무결성**: 데이터 정확성 영향
- **성능**: 시스템 성능 영향

### Phase 5: 체계적 수정 (4-6시간)

#### 5.1 공통 필드명 표준화
```typescript
// 표준 필드명 정의
interface StandardFields {
  id: string;           // MongoDB _id를 id로 통일
  createdAt: Date;      // created_at vs createdAt 통일
  updatedAt: Date;      // updated_at vs updatedAt 통일
}
```

#### 5.2 API 응답 구조 표준화
```typescript
// 표준 응답 구조
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
```

#### 5.3 주요 엔티티별 수정 계획

**User 엔티티:**
- ✅ `_id` ↔ `id` 매핑 확인
- ✅ `leaveBalance` 필드 일관성
- ✅ `permissions` 배열 구조
- ✅ `department`, `position` 필드

**Leave 엔티티:**
- ✅ `daysCount` vs `days` 필드명
- ✅ `leaveType` 열거형 값
- ✅ `status` 상태 값 일관성
- ✅ 날짜 필드 형식 (ISO string vs Date)

**Department/Position 엔티티:**
- ✅ `title` vs `name` 필드 통일
- ✅ 계층 구조 표현 방식
- ✅ 관계 데이터 표현

### Phase 6: 검증 및 테스트 (2시간)

#### 6.1 자동화된 일관성 테스트
```javascript
// api-consistency-test.js
describe('API Consistency Tests', () => {
  test('User API endpoints match frontend calls', () => {
    // 모든 사용자 관련 API 일관성 검증
  });
  
  test('Data structures match TypeScript interfaces', () => {
    // 데이터 구조 일관성 검증
  });
});
```

#### 6.2 E2E 통합 테스트
- 실제 API 호출로 응답 구조 검증
- 타입 안전성 확인
- 오류 처리 일관성 확인

## 📁 생성할 산출물

### 분석 문서
- `api-inventory.md` - 전체 API 목록
- `data-model-mapping.md` - 데이터 모델 매핑
- `inconsistencies-report.md` - 발견된 불일치 목록

### 자동화 도구
- `scripts/check-api-consistency.js` - API 일관성 검사
- `scripts/check-data-consistency.js` - 데이터 구조 검사
- `scripts/generate-api-docs.js` - API 문서 자동 생성

### 수정 가이드
- `FIELD_MAPPING.md` - 필드명 매핑 가이드
- `API_STANDARDS.md` - API 설계 표준
- `TYPE_DEFINITIONS.md` - 타입 정의 표준

## 🛠 도구 및 기술

### 분석 도구
- **ripgrep (rg)**: 빠른 파일 검색
- **jq**: JSON 데이터 처리
- **TypeScript Compiler**: 타입 검증
- **ESLint**: 코드 일관성 검사

### 검증 도구
- **Jest**: 자동화된 테스트
- **Postman/Insomnia**: API 테스트
- **TypeScript**: 컴파일 타임 검증

## 📊 예상 발견 불일치 유형

### 1. 필드명 불일치
```typescript
// Frontend
interface User {
  id: string;
  birthDate: string;
}

// Backend
{
  _id: ObjectId,
  birth_date: string
}
```

### 2. 데이터 타입 불일치
```typescript
// Frontend expects string
leaveBalance: string;

// Backend sends number
leaveBalance: 15
```

### 3. API 엔드포인트 불일치
```typescript
// Frontend calls
apiService.get('/api/user-profile')

// Backend defines
router.get('/api/users/profile')
```

### 4. 응답 구조 불일치
```typescript
// Frontend expects
{ success: true, data: users }

// Backend sends
{ users: [...] }
```

## 🎯 성공 기준

✅ **100% API 엔드포인트 매칭**
✅ **모든 TypeScript 타입 오류 해결**
✅ **런타임 오류 0건**
✅ **일관된 필드명 사용**
✅ **표준화된 API 응답 구조**

## ⚠️ 주의사항

1. **하위 호환성**: 기존 데이터와의 호환성 유지
2. **점진적 수정**: 한 번에 모든 것을 바꾸지 않고 단계적 적용
3. **철저한 테스트**: 각 수정 후 기능 동작 확인
4. **문서화**: 모든 변경사항 문서화
5. **팀 동기화**: 변경된 표준에 대한 팀 공유

## 🚀 기대 효과

- **개발 효율성 향상**: 필드명/API 불일치로 인한 디버깅 시간 단축
- **타입 안전성**: TypeScript의 정완한 타입 체크 활용
- **유지보수성**: 일관된 코드 구조로 유지보수 용이성 증대
- **신규 개발자 온보딩**: 명확한 표준으로 학습 곡선 단축
- **버그 감소**: 컴파일 타임에 더 많은 오류 발견

---

**💡 결론**: 체계적인 분석과 자동화 도구를 통해 Frontend-Backend 간의 완전한 일관성을 확보하여, 더 안정적이고 유지보수하기 쉬운 시스템을 구축합니다.