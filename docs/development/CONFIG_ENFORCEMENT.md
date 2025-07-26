# 🔒 설정 사용 강제 가이드

이 문서는 프로젝트에서 설정 사용을 강제하고 하드코딩을 방지하는 방법을 설명합니다.

## 🎯 목표

1. **하드코딩 완전 제거**: 모든 상수를 중앙에서 관리
2. **타입 안전성 보장**: TypeScript로 컴파일 시점 검증
3. **자동 검증**: 개발 중 실시간 위반 사항 감지
4. **쉬운 사용**: Hook과 유틸리티로 편리한 사용

## 🔧 구현된 강제 메커니즘

### 1. ESLint 규칙 (컴파일 시점 검증)

```javascript
// ❌ 하드코딩 - ESLint 에러 발생
const leaveType = 'annual';
const status = 'pending';

// ✅ 설정 사용 - 통과
import { LEAVE_CONFIG } from '@/config/constants';
const leaveType = LEAVE_CONFIG.TYPES.ANNUAL;
const status = LEAVE_CONFIG.STATUS.PENDING;
```

### 2. TypeScript 타입 시스템 (컴파일 시점 검증)

```typescript
// ❌ 잘못된 타입 - 컴파일 에러
interface LeaveForm {
  leaveType: string; // 너무 광범위
}

// ✅ 강제된 타입 - 통과
import { LeaveType } from '@/types/config';
interface LeaveForm {
  leaveType: LeaveType; // 'annual' | 'sick' | 'personal' | 'family'만 허용
}
```

### 3. 런타임 검증 (개발 중 실시간 감지)

```typescript
import { configEnforcer } from '@/utils/configEnforcer';

// 개발 환경에서 자동으로 하드코딩 감지 및 경고
const type = configEnforcer.checkLeaveType('annual', 'MyComponent');
```

### 4. 커스텀 Hook (사용 편의성)

```typescript
// ❌ 하드코딩된 로직
function getLeaveLabel(type: string) {
  switch(type) {
    case 'annual': return '연차';
    case 'sick': return '병가';
    // ...
  }
}

// ✅ Hook 사용
import { useLeaveConfig } from '@/hooks/useConfig';
const { getTypeLabel } = useLeaveConfig();
const label = getTypeLabel(type);
```

## 📋 사용 방법

### 1. 기본 상수 사용

```typescript
// 🔧 import
import { LEAVE_CONFIG, USER_ROLES, SUCCESS_MESSAGES } from '@/config/constants';

// 🎯 사용
const leaveType = LEAVE_CONFIG.TYPES.ANNUAL;
const userRole = USER_ROLES.ADMIN;
const message = SUCCESS_MESSAGES.SAVE_SUCCESS;
```

### 2. Hook 사용 (권장)

```typescript
// 🔧 import
import { useConfig } from '@/hooks/useConfig';

// 🎯 사용
const { leave, user, message } = useConfig();
const typeLabel = leave.getTypeLabel(LEAVE_CONFIG.TYPES.ANNUAL);
const hasPermission = user.hasPermission(userRole, USER_ROLES.MANAGER);
```

### 3. 타입 안전성 확보

```typescript
// 🔧 import
import { LeaveType, LeaveStatus } from '@/types/config';

// 🎯 사용
interface LeaveRequest {
  type: LeaveType;      // 자동 완성 + 타입 검증
  status: LeaveStatus;  // 자동 완성 + 타입 검증
}
```

### 4. 설정 검증

```typescript
// 🔧 import
import { useConfigValidation } from '@/hooks/useConfig';

// 🎯 사용
const { validateLeaveRequest } = useConfigValidation();
const result = validateLeaveRequest(formData);
if (!result.isValid) {
  console.error(result.errors);
}
```

## 🚨 위반 사항 감지 및 해결

### 자동 감지 시스템

개발 환경에서는 다음과 같은 위반 사항이 자동으로 감지됩니다:

```typescript
// 🚨 자동 감지되는 위반 사항들
const type = 'annual';           // → LEAVE_CONFIG.TYPES.ANNUAL 사용
const status = 'pending';        // → LEAVE_CONFIG.STATUS.PENDING 사용
const role = 'admin';            // → USER_ROLES.ADMIN 사용
const message = '저장되었습니다.';  // → SUCCESS_MESSAGES.SAVE_SUCCESS 사용
```

### 위반 사항 리포트

```typescript
import { configEnforcer } from '@/utils/configEnforcer';

// 위반 사항 확인
console.log(configEnforcer.generateReport());
```

## 📝 개발 워크플로우

### 1. 새로운 상수 추가

```typescript
// 📁 src/config/constants.ts
export const NEW_FEATURE_CONFIG = {
  OPTION_A: 'option_a',
  OPTION_B: 'option_b',
} as const;
```

### 2. 타입 정의

```typescript
// 📁 src/types/config.ts
export type NewFeatureOption = typeof NEW_FEATURE_CONFIG[keyof typeof NEW_FEATURE_CONFIG];
```

### 3. Hook 추가

```typescript
// 📁 src/hooks/useConfig.ts
export const useNewFeatureConfig = () => {
  // 로직 구현
};
```

### 4. 검증 규칙 추가

```typescript
// 📁 .eslintrc.js
'no-restricted-syntax': [
  'error',
  {
    selector: 'Literal[value=/^(option_a|option_b)$/]',
    message: 'NEW_FEATURE_CONFIG 상수를 사용하세요.',
  },
],
```

## 🎨 VS Code 자동 완성

프로젝트에는 다음과 같은 코드 스니펫이 포함되어 있습니다:

- `leave-type` → 휴가 타입 상수 가져오기
- `leave-status` → 휴가 상태 상수 가져오기
- `user-role` → 사용자 역할 상수 가져오기
- `use-config` → 설정 Hook 사용하기
- `api-endpoint` → API 엔드포인트 가져오기

## 🔍 디버깅 및 모니터링

### 개발 환경 모니터링

```typescript
// 브라우저 콘솔에서 확인
console.log(configEnforcer.getViolations());
console.log(configEnforcer.generateReport());
```

### 설정 사용 현황 분석

```typescript
import { analyzeConfigUsage } from '@/utils/configEnforcer';

// 현재 설정 사용 현황 분석
analyzeConfigUsage();
```

## 🚀 마이그레이션 도구

기존 하드코딩된 코드를 자동으로 변환:

```typescript
import { migrateHardcodedValues } from '@/utils/configEnforcer';

const oldCode = `const type = "annual";`;
const newCode = migrateHardcodedValues(oldCode);
// 결과: const type = LEAVE_CONFIG.TYPES.ANNUAL;
```

## 📊 성과 측정

### 성공 지표

- ✅ ESLint 에러 0개
- ✅ TypeScript 컴파일 에러 0개
- ✅ 런타임 위반 사항 0개
- ✅ 코드 리뷰에서 하드코딩 지적 0개

### 모니터링 방법

1. **개발 시**: 브라우저 콘솔에서 실시간 확인
2. **빌드 시**: ESLint 및 TypeScript 검증
3. **코드 리뷰**: 자동 검증 도구 결과 확인
4. **배포 전**: 전체 설정 검증 실행

## 🎯 팀 협업 가이드

### 새로운 팀원 온보딩

1. 이 문서 숙지
2. VS Code 스니펫 설치
3. 간단한 컴포넌트 작성 연습
4. 코드 리뷰 받기

### 코드 리뷰 체크리스트

- [ ] 하드코딩된 문자열 없음
- [ ] 설정 상수 사용 확인
- [ ] 타입 안전성 확보
- [ ] Hook 사용 권장 사항 준수
- [ ] 새로운 상수 추가 시 문서 업데이트

## 🔄 지속적 개선

### 정기 점검 (월 1회)

1. 설정 사용 현황 분석
2. 새로운 하드코딩 패턴 확인
3. ESLint 규칙 업데이트
4. 팀 피드백 수집 및 반영

### 새로운 기능 추가 시

1. 상수 정의 우선
2. 타입 안전성 확보
3. Hook 및 유틸리티 추가
4. 검증 규칙 추가
5. 문서 업데이트

이 가이드를 따라 개발하면 일관되고 유지보수가 쉬운 코드를 작성할 수 있습니다! 🚀