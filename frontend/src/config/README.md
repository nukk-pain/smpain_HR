# 설정 관리 가이드

이 폴더는 프로젝트의 모든 설정을 중앙에서 관리하는 파일들을 포함합니다.

## 📁 파일 구조

```
config/
├── constants.ts      # 모든 상수 정의
├── paths.ts         # 경로 관리
├── env.ts           # 환경별 설정
├── index.ts         # 설정 통합 export
└── README.md        # 이 문서
```

## 🔧 사용법

### 1. 상수 사용하기

```typescript
// constants.ts에서 상수 가져오기
import { LEAVE_CONFIG, API_CONFIG, UI_CONFIG } from '@/config/constants';

// 휴가 타입 사용
const leaveType = LEAVE_CONFIG.TYPES.ANNUAL;

// API 설정 사용
const apiTimeout = API_CONFIG.TIMEOUT;

// UI 설정 사용
const pageSize = UI_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
```

### 2. 경로 관리

```typescript
// paths.ts에서 경로 가져오기
import { API_ENDPOINTS, ROUTE_PATHS } from '@/config/paths';

// API 엔드포인트 사용
const leaveApi = API_ENDPOINTS.LEAVE.BASE;
const leaveById = API_ENDPOINTS.LEAVE.BY_ID('123');

// 라우트 경로 사용
const dashboardPath = ROUTE_PATHS.DASHBOARD;
```

### 3. 환경별 설정

```typescript
// env.ts에서 환경 설정 가져오기
import { 
  isDevelopment, 
  isProduction, 
  getApiUrl, 
  getLogLevel 
} from '@/config/env';

// 환경별 분기 처리
if (isDevelopment()) {
  console.log('Development mode');
}

// 환경별 설정 사용
const apiUrl = getApiUrl();
const logLevel = getLogLevel();
```

### 4. 통합 설정 사용

```typescript
// index.ts에서 모든 설정 가져오기
import { 
  LEAVE_CONFIG, 
  API_ENDPOINTS, 
  isDevelopment,
  appConfig 
} from '@/config';

// 앱 설정 사용
console.log(appConfig.name); // "Leave Management System"
console.log(appConfig.version); // "1.0.0"
```

## 📋 주요 상수 목록

### 휴가 관련 상수
- `LEAVE_CONFIG.TYPES`: 휴가 유형
- `LEAVE_CONFIG.STATUS`: 휴가 상태
- `LEAVE_CONFIG.ANNUAL_LEAVE`: 연차 관련 설정
- `LEAVE_CONFIG.BUSINESS_RULES`: 비즈니스 규칙

### API 관련 상수
- `API_CONFIG.BASE_URL`: API 기본 URL
- `API_CONFIG.TIMEOUT`: API 타임아웃
- `API_ENDPOINTS`: 모든 API 엔드포인트

### UI 관련 상수
- `UI_CONFIG.PAGINATION`: 페이지네이션 설정
- `UI_CONFIG.NOTIFICATION`: 알림 설정
- `UI_CONFIG.THEME`: 테마 설정

### 날짜 관련 상수
- `DATE_CONFIG.FORMATS`: 날짜 형식
- `DATE_CONFIG.LOCALE`: 로케일 설정

## 🔄 경로 별칭 (@) 사용

프로젝트에서는 `@` 별칭을 사용하여 절대 경로를 참조할 수 있습니다:

```typescript
// ✅ 좋은 예 - 절대 경로 사용
import { LEAVE_CONFIG } from '@/config/constants';
import { useAuth } from '@/components/AuthProvider';
import { ApiService } from '@/services/api';

// ❌ 나쁜 예 - 상대 경로 사용
import { LEAVE_CONFIG } from '../../../config/constants';
import { useAuth } from '../../components/AuthProvider';
import { ApiService } from '../services/api';
```

## 📝 새로운 상수 추가하기

1. **constants.ts**에 새로운 상수 추가:

```typescript
export const NEW_FEATURE_CONFIG = {
  ENABLED: true,
  MAX_ITEMS: 100,
  DEFAULT_VALUE: 'default',
} as const;
```

2. **index.ts**에서 export:

```typescript
export * from './constants';
```

3. 컴포넌트에서 사용:

```typescript
import { NEW_FEATURE_CONFIG } from '@/config';

const maxItems = NEW_FEATURE_CONFIG.MAX_ITEMS;
```

## 🚨 주의사항

1. **상수는 불변(immutable)**으로 정의하세요:
   ```typescript
   // ✅ 좋은 예
   export const CONFIG = {
     VALUE: 'constant'
   } as const;
   
   // ❌ 나쁜 예
   export const CONFIG = {
     VALUE: 'constant'
   };
   ```

2. **의미 있는 이름**을 사용하세요:
   ```typescript
   // ✅ 좋은 예
   export const LEAVE_CONFIG = {
     TYPES: {
       ANNUAL: 'annual'
     }
   };
   
   // ❌ 나쁜 예
   export const CONFIG = {
     T1: 'annual'
   };
   ```

3. **환경별 설정**은 env.ts에서 관리하세요:
   ```typescript
   // ✅ 좋은 예
   export const getApiUrl = () => {
     return isDevelopment() ? 'http://localhost:5444' : '/api';
   };
   ```

4. **타입 안전성**을 위해 TypeScript 타입을 정의하세요:
   ```typescript
   export type LeaveType = 'annual' | 'sick' | 'personal' | 'family';
   export type LeaveStatus = 'pending' | 'approved' | 'rejected';
   ```

## 🔧 설정 유효성 검사

앱 시작 시 설정 유효성 검사를 실행합니다:

```typescript
import { initializeConfig } from '@/config';

// main.tsx에서 호출
initializeConfig(); // 설정 검증 및 초기화
```

이 가이드를 따라 설정을 관리하면 코드의 일관성을 유지하고 유지보수가 쉬워집니다.