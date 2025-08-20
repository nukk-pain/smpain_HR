# TypeScript 오류 해결 가이드

## 개요
이 문서는 HR 프로젝트에서 발생하는 TypeScript 오류를 체계적으로 해결하는 방법을 정리합니다.

## 1. TypeScript 오류 확인 방법

### 1.1 명령어로 확인
```bash
cd frontend
npm run build-check  # TypeScript 체크 + 빌드
# 또는
npx tsc --noEmit    # 빌드 없이 타입 체크만
```

### 1.2 VS Code에서 확인
- 빨간 밑줄이 있는 코드 확인
- Problems 패널 (Ctrl/Cmd + Shift + M)에서 전체 오류 목록 확인
- 파일 탭에 빨간 점이 있으면 해당 파일에 오류 존재

### 1.3 오류 통계 확인
```bash
npx tsc --noEmit | grep "error TS" | wc -l  # 오류 개수 확인
npx tsc --noEmit > typescript-errors.log 2>&1  # 오류를 파일로 저장
```

## 2. 자주 발생하는 TypeScript 오류와 해결법

### 2.1 Type 'undefined' is not assignable to type 'string'
**원인**: 값이 undefined일 수 있는데 string 타입을 요구하는 경우

**해결방법**:
```typescript
// 방법 1: Optional chaining과 기본값
const value = data?.field || '';

// 방법 2: Type assertion (확실한 경우만)
const value = data!.field;

// 방법 3: Type guard
if (data && data.field) {
  const value = data.field; // 여기서는 string으로 추론됨
}

// 방법 4: Nullish coalescing
const value = data?.field ?? '';
```

### 2.2 Property 'X' does not exist on type 'Y'
**원인**: 타입 정의에 해당 속성이 없는 경우

**해결방법**:
```typescript
// 방법 1: 인터페이스/타입 수정
interface User {
  id: string;
  name: string;
  email?: string; // 추가
}

// 방법 2: Type assertion
const email = (user as any).email;

// 방법 3: 타입 확장
interface ExtendedUser extends User {
  email: string;
}
```

### 2.3 Argument of type 'X' is not assignable to parameter of type 'Y'
**원인**: 함수 매개변수 타입 불일치

**해결방법**:
```typescript
// 방법 1: 타입 변환
parseInt(value.toString());

// 방법 2: 타입 가드
if (typeof value === 'string') {
  processString(value);
}

// 방법 3: 유니온 타입 사용
function process(value: string | number) {
  // ...
}
```

### 2.4 Object is possibly 'null' or 'undefined'
**원인**: 값이 null/undefined일 수 있는데 직접 접근하려는 경우

**해결방법**:
```typescript
// 방법 1: Optional chaining
const name = user?.profile?.name;

// 방법 2: Nullish coalescing
const name = user?.name ?? 'Unknown';

// 방법 3: 명시적 체크
if (user && user.profile) {
  console.log(user.profile.name);
}
```

### 2.5 Cannot find name 'X' / Cannot find module 'X'
**원인**: import 누락 또는 모듈 미설치

**해결방법**:
```typescript
// 방법 1: import 추가
import { ComponentName } from './ComponentName';

// 방법 2: 타입 정의 설치
npm install --save-dev @types/module-name

// 방법 3: 커스텀 타입 정의 (d.ts 파일)
declare module 'module-name' {
  export function someFunction(): void;
}
```

## 3. 프로젝트별 특수 케이스

### 3.1 MUI Grid 관련 오류
```typescript
// 오류: 'item' prop doesn't exist
<Grid item xs={12}>  // ❌

// 해결: MUI v5에서는 Grid2 사용 또는 size prop
<Grid size={12}>     // ✅
```

### 3.2 API Response 타입 오류
```typescript
// 오류: Property doesn't exist on response
const data = response.data.items; // ❌

// 해결: 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const response: ApiResponse<{items: Item[]}> = await api.get();
const data = response.data.items; // ✅
```

### 3.3 Event Handler 타입 오류
```typescript
// 오류: Parameter 'e' implicitly has an 'any' type
onChange={(e) => setValue(e.target.value)} // ❌

// 해결: 이벤트 타입 명시
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} // ✅
```

## 4. 디버깅 전략

### 4.1 단계별 접근
1. **오류 메시지 읽기**: 정확한 오류 위치와 타입 확인
2. **타입 확인**: VS Code에서 변수에 마우스 오버하여 추론된 타입 확인
3. **타입 좁히기**: Type guards, assertions 사용
4. **임시 해결**: `// @ts-ignore` 또는 `any` 타입 (나중에 수정)

### 4.2 유용한 TypeScript 설정
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 4.3 타입 체크 무시 (임시 해결책)
```typescript
// 한 줄만 무시
// @ts-ignore
problematicCode();

// 파일 전체 무시 (파일 최상단)
// @ts-nocheck

// 특정 오류만 무시
// @ts-expect-error
```

## 5. 예방 방법

### 5.1 타입 정의 우선
- 함수 작성 시 매개변수와 반환 타입 명시
- 인터페이스/타입 별도 파일로 관리
- API 응답에 대한 타입 정의

### 5.2 Strict Mode 활용
- `strict: true` 설정으로 엄격한 타입 체크
- 초기엔 오류가 많지만 장기적으로 안정적

### 5.3 타입 추론 활용
- 명확한 경우 TypeScript의 타입 추론에 의존
- 복잡한 경우만 명시적 타입 선언

## 6. 도구 활용

### 6.1 VS Code Extensions
- TypeScript Hero: import 자동 정리
- TypeScript Importer: 자동 import
- Error Lens: 인라인 오류 표시

### 6.2 CLI 도구
```bash
# 사용하지 않는 exports 찾기
npx ts-prune

# 타입 커버리지 확인
npx type-coverage

# 점진적 마이그레이션
npx ts-migrate
```

## 7. 실제 해결 사례

### 7.1 UnifiedLeaveOverview 타입 오류
```typescript
// 오류
initialViewMode: props.initialViewMode || 'overview'

// 해결: Type assertion
initialViewMode: (props.initialViewMode || 'overview') as 'overview' | 'team' | 'department'
```

### 7.2 API Service 중복 메서드
```typescript
// 오류: Duplicate function implementation
calculateIncentive() { ... }  // 333번 줄
calculateIncentive() { ... }  // 689번 줄

// 해결: 중복 제거
// 689번 줄 메서드 삭제
```

## 8. 트러블슈팅 체크리스트

- [ ] 정확한 오류 메시지와 위치 확인
- [ ] 관련 타입 정의 확인
- [ ] import 문 확인
- [ ] tsconfig.json 설정 확인
- [ ] node_modules/@types 확인
- [ ] 타입 추론 결과 확인 (hover)
- [ ] 유사한 코드에서 해결 방법 참고
- [ ] 필요시 타입 정의 수정/추가

## 9. 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [MUI TypeScript Guide](https://mui.com/material-ui/guides/typescript/)