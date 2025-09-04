# 문서 관리 페이지 Type 이름 수정 계획

## 현재 상황 분석

### 현재 사용 중인 Document Type
1. **payslip** - 급여명세서
2. **certificate** - 증명서
3. **contract** - 계약서
4. **other** - 기타

### 문제점
- AdminDocuments.tsx의 line 474-478에서 `doc.type`을 그대로 표시하여 영어 타입명이 UI에 노출됨
- MyDocuments.tsx에서도 동일한 문제 존재 가능성 있음
- 사용자에게 영문 타입명(payslip, certificate 등)이 그대로 보여 직관적이지 않음

## 수정 방안

### 1. Type 이름 매핑 함수 생성
다음과 같이 type을 한글 이름으로 매핑하는 유틸리티 함수 생성:

```typescript
const getDocumentTypeLabel = (type: string): string => {
  const typeLabels: Record<string, string> = {
    'payslip': '급여명세서',
    'certificate': '증명서',
    'contract': '계약서',
    'other': '기타'
  };
  return typeLabels[type] || type;
};
```

### 2. 수정이 필요한 파일 및 위치

#### AdminDocuments.tsx
- **Line 474-478**: Chip label 수정
  ```jsx
  // 현재
  <Chip 
    label={doc.type} 
    size="small" 
    variant="outlined"
  />
  
  // 수정 후
  <Chip 
    label={getDocumentTypeLabel(doc.type)} 
    size="small" 
    variant="outlined"
  />
  ```

- **Line 405-408**: Select MenuItem은 이미 한글로 되어 있음 (유지)
  ```jsx
  <MenuItem value="payslip">급여명세서</MenuItem>
  <MenuItem value="certificate">증명서</MenuItem>
  <MenuItem value="contract">계약서</MenuItem>
  <MenuItem value="other">기타</MenuItem>
  ```

#### MyDocuments.tsx
동일한 패턴이 있다면 같은 방식으로 수정 필요

### 3. 중앙집중식 상수 관리 (권장)
더 나은 유지보수를 위해 `/frontend/src/config/` 폴더에 문서 타입 상수 파일 생성:

```typescript
// /frontend/src/config/documentTypes.ts
export const DOCUMENT_TYPES = {
  PAYSLIP: 'payslip',
  CERTIFICATE: 'certificate',
  CONTRACT: 'contract',
  OTHER: 'other'
} as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  [DOCUMENT_TYPES.PAYSLIP]: '급여명세서',
  [DOCUMENT_TYPES.CERTIFICATE]: '증명서',
  [DOCUMENT_TYPES.CONTRACT]: '계약서',
  [DOCUMENT_TYPES.OTHER]: '기타'
};

export const getDocumentTypeLabel = (type: string): string => {
  return DOCUMENT_TYPE_LABELS[type] || type;
};
```

## 구현 순서

1. **config 파일 생성**: `/frontend/src/config/documentTypes.ts` 생성
2. **AdminDocuments.tsx 수정**: 
   - import 추가
   - Chip label 부분 수정
3. **MyDocuments.tsx 확인 및 수정**: 
   - 동일한 패턴 찾아서 수정
4. **테스트**: 
   - 문서 관리 페이지에서 type이 한글로 표시되는지 확인
   - 필터링 기능이 정상 작동하는지 확인

## 추가 고려사항

1. **백엔드 일관성**: 백엔드 API는 영문 type 값을 유지 (데이터베이스 일관성)
2. **다국어 지원**: 향후 다국어 지원 시 i18n 시스템으로 전환 가능
3. **타입 안정성**: TypeScript의 union type으로 타입 제한 강화 가능

## 유지보수 가이드

### 문서 타입 추가/변경 시 절차

1. **위치**: `/frontend/src/config/documentTypes.ts` 파일을 수정합니다.
2. **타입 추가 예시**:
   ```typescript
   // 1. DOCUMENT_TYPES에 새 타입 추가
   export const DOCUMENT_TYPES = {
     PAYSLIP: 'payslip',
     CERTIFICATE: 'certificate',
     CONTRACT: 'contract',
     OTHER: 'other',
     HANDBOOK: 'handbook'  // 새로 추가
   } as const;

   // 2. DOCUMENT_TYPE_LABELS에 한글 레이블 추가
   export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
     [DOCUMENT_TYPES.PAYSLIP]: '급여명세서',
     [DOCUMENT_TYPES.CERTIFICATE]: '증명서',
     [DOCUMENT_TYPES.CONTRACT]: '계약서',
     [DOCUMENT_TYPES.OTHER]: '기타',
     [DOCUMENT_TYPES.HANDBOOK]: '사원수첩'  // 새로 추가
   };
   ```

3. **증명서 세부 타입 추가 시**:
   ```typescript
   // 별도의 증명서 타입 관리
   export const CERTIFICATE_TYPES = {
     EMPLOYMENT: 'employment',
     INCOME: 'income',
     CAREER: 'career'
   } as const;

   export const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
     [CERTIFICATE_TYPES.EMPLOYMENT]: '재직증명서',
     [CERTIFICATE_TYPES.INCOME]: '소득증명서',
     [CERTIFICATE_TYPES.CAREER]: '경력증명서'
   };
   ```

### 중요 규칙

⚠️ **절대 하드코딩하지 마세요**: 
- 새로운 문서 타입이나 레이블이 필요할 때는 반드시 `/frontend/src/config/documentTypes.ts` 파일을 수정하세요.
- UI 컴포넌트에서 직접 한글 문자열을 작성하지 마세요.
- 이 방식을 통해 전체 애플리케이션에서 일관된 레이블을 유지할 수 있습니다.

### 장점
- **중앙 관리**: 한 곳에서 모든 문서 타입과 레이블 관리
- **타입 안정성**: TypeScript를 통한 컴파일 타임 체크
- **일관성 보장**: 전체 애플리케이션에서 동일한 레이블 사용
- **쉬운 수정**: 레이블 변경 시 한 곳만 수정하면 됨

## 예상 결과

- 사용자는 문서 관리 페이지에서 영문 대신 한글 타입명을 보게 됨
- 코드 재사용성 향상 (중앙집중식 관리)
- 향후 타입 추가/변경 시 한 곳에서만 수정하면 됨