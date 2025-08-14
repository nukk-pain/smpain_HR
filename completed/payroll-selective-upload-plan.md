# 급여 데이터 선택적 업로드 기능 구현 계획

## 목표
Excel 파일 업로드 시 사용자가 원하는 직원 데이터만 선택적으로 전송할 수 있는 기능 구현

## 현재 상황 분석

### 현재 문제점
- `invalidRecords > 0`일 때 "데이터베이스에 저장" 버튼이 완전히 비활성화됨
- 일부 유효한 레코드가 있어도 전체 업로드가 차단됨
- 사용자가 부분적으로 데이터를 처리할 수 없음

### 기존 인프라
- `recordActions` Map으로 각 레코드의 처리 방식 관리 중
- 백엔드는 이미 선택적 레코드 처리 지원 (`action === 'skip'`)
- `PayrollUnmatchedSection` 컴포넌트에서 수동 매칭 기능 제공

## 구현 계획

### Phase 1: UI 컴포넌트 수정

#### 1.1 PayrollPreviewTable 컴포넌트 개선
**파일**: `/frontend/src/components/PayrollPreviewTable.tsx`

- [ ] 각 행에 체크박스 컬럼 추가
- [ ] 헤더에 전체 선택/해제 체크박스 추가
- [ ] 체크박스 상태 관리를 위한 state 추가
- [ ] 기본값 설정: 
  - 유효한 레코드 (`status === 'valid'`): 체크됨
  - 무효한 레코드 (`status === 'invalid'`): 체크 안됨
  - 경고 레코드 (`status === 'warning'`): 체크됨
  - 중복 레코드 (`status === 'duplicate'`): 체크 안됨

```typescript
// 추가될 Props
interface PayrollPreviewTableProps {
  records: PreviewRecord[];
  selectedRecords: Set<number>;
  onRecordSelectionChange: (rowNumber: number, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}
```

#### 1.2 선택 상태 시각화
- [ ] 선택된 행 하이라이트 (배경색 변경)
- [ ] 선택 개수 표시: "총 100개 중 85개 선택됨"
- [ ] 상태별 아이콘 표시:
  - ✅ 유효 (초록색)
  - ⚠️ 경고 (노란색)
  - ❌ 오류 (빨간색)
  - 🔄 중복 (파란색)

### Phase 2: 상태 관리 로직 수정

#### 2.1 PayrollExcelUploadWithPreview 컴포넌트
**파일**: `/frontend/src/components/PayrollExcelUploadWithPreview.tsx`

- [ ] 선택된 레코드 관리 state 추가
```typescript
const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
```

- [ ] recordActions와 selectedRecords 통합 관리
```typescript
// 레코드 선택 변경 핸들러
const handleRecordSelectionChange = (rowNumber: number, selected: boolean) => {
  const newSelected = new Set(selectedRecords);
  const updated = new Map(recordActions);
  
  if (selected) {
    newSelected.add(rowNumber);
    // 선택된 레코드는 'skip' 액션 제거
    if (updated.get(rowNumber)?.action === 'skip') {
      updated.delete(rowNumber);
    }
  } else {
    newSelected.delete(rowNumber);
    // 선택 해제된 레코드는 'skip' 액션 추가
    updated.set(rowNumber, { action: 'skip' });
  }
  
  setSelectedRecords(newSelected);
  setRecordActions(updated);
};
```

- [ ] 초기 선택 상태 설정 (useEffect)
```typescript
useEffect(() => {
  if (state.previewData) {
    const initialSelected = new Set<number>();
    state.previewData.records.forEach((record, index) => {
      // 유효한 레코드와 경고 레코드는 기본 선택
      if (record.status === 'valid' || record.status === 'warning') {
        initialSelected.add(index + 1);
      }
    });
    setSelectedRecords(initialSelected);
  }
}, [state.previewData]);
```

#### 2.2 버튼 활성화 조건 수정
**현재 코드** (571-575행):
```typescript
disabled={
  state.confirming ||
  submitAttempted ||
  state.previewData.summary.invalidRecords > 0
}
```

**수정 후**:
```typescript
disabled={
  state.confirming ||
  submitAttempted ||
  selectedRecords.size === 0  // 최소 1개 이상 선택되어야 활성화
}
```

### Phase 3: 요약 정보 개선

#### 3.1 PayrollUploadSummary 컴포넌트 수정
**파일**: `/frontend/src/components/PayrollUploadSummary.tsx`

- [ ] 선택 상태 요약 정보 추가
```typescript
interface SummaryProps {
  records: PreviewRecord[];
  recordActions: Map<number, {action: 'skip' | 'manual', userId?: string}>;
  selectedRecords: Set<number>;
}
```

- [ ] 표시할 정보:
  - 전체 레코드 수
  - 선택된 레코드 수
  - 제외될 레코드 수
  - 수동 매칭 필요 레코드 수
  - 예상 저장 성공 레코드 수

### Phase 4: 확인 다이얼로그 개선

#### 4.1 상세 정보 표시
**위치**: 745-795행의 Dialog 컴포넌트

- [ ] 선택된 레코드 정보 명확히 표시
- [ ] 제외될 레코드 목록 표시 (접을 수 있는 섹션)
- [ ] 경고 메시지 강화:
```typescript
<Alert severity="warning">
  <Typography variant="body2">
    • 선택한 {selectedRecords.size}개 레코드만 저장됩니다
    • 선택하지 않은 {totalRecords - selectedRecords.size}개 레코드는 저장되지 않습니다
    • 저장 후에는 수정할 수 없습니다
  </Typography>
</Alert>
```

### Phase 5: 백엔드 연동 검증

#### 5.1 API 요청 수정
**handleConfirm 함수** (259-324행):

- [ ] recordActions 생성 시 선택되지 않은 레코드 모두 'skip' 처리
```typescript
const recordActionsArray = [];
state.previewData.records.forEach((record, index) => {
  const rowNumber = index + 1;
  
  // 선택되지 않은 레코드는 skip
  if (!selectedRecords.has(rowNumber)) {
    recordActionsArray.push({
      rowNumber,
      action: 'skip',
      userId: undefined
    });
  }
  // 수동 매칭된 레코드
  else if (recordActions.has(rowNumber)) {
    const action = recordActions.get(rowNumber);
    recordActionsArray.push({
      rowNumber,
      action: action.action,
      userId: action.userId
    });
  }
  // 정상 처리될 레코드 (명시적으로 전송하지 않아도 됨)
});
```

### Phase 6: 사용자 경험 개선

#### 6.1 빠른 작업 버튼 추가
- [ ] "유효한 레코드만 선택" 버튼
- [ ] "경고 제외하고 선택" 버튼
- [ ] "모두 선택" / "모두 해제" 버튼
- [ ] "선택 반전" 버튼

#### 6.2 필터링 기능
- [ ] 상태별 필터 (유효/경고/오류/중복)
- [ ] 부서별 필터
- [ ] 이름 검색

#### 6.3 실시간 피드백
- [ ] 선택 변경 시 즉시 요약 정보 업데이트
- [ ] 저장될 총 급여액 표시
- [ ] 제외될 직원 목록 미리보기

## 테스트 시나리오

### 시나리오 1: 기본 동작
1. Excel 파일 업로드
2. 유효한 레코드는 자동 체크 확인
3. 무효한 레코드는 자동 언체크 확인
4. 저장 버튼 활성화 확인

### 시나리오 2: 선택적 저장
1. 일부 레코드 선택 해제
2. 요약 정보 업데이트 확인
3. 저장 시 선택된 레코드만 저장 확인
4. 응답에서 정확한 개수 확인

### 시나리오 3: 수동 매칭과 통합
1. Unmatched 레코드 수동 매칭
2. 매칭된 레코드 자동 선택 확인
3. 저장 시 정상 처리 확인

### 시나리오 4: 에지 케이스
1. 모든 레코드 선택 해제 → 버튼 비활성화
2. 1개만 선택 → 버튼 활성화
3. 중복 레코드 처리 옵션과 함께 동작

## 예상 소요 시간
- Phase 1-2: 2시간 (UI 및 상태 관리)
- Phase 3-4: 1시간 (요약 정보 및 다이얼로그)
- Phase 5: 30분 (백엔드 연동)
- Phase 6: 1.5시간 (UX 개선)
- 테스트: 1시간
- **총 예상 시간: 6시간**

## 위험 요소 및 대응 방안

### 위험 1: 대량 데이터 성능
- **문제**: 1000개 이상 레코드 시 체크박스 렌더링 성능
- **대응**: React.memo, 가상 스크롤링 적용

### 위험 2: 사용자 실수
- **문제**: 실수로 중요 레코드 선택 해제
- **대응**: 확인 다이얼로그에서 상세 정보 제공

### 위험 3: 백엔드 호환성
- **문제**: recordActions 형식 변경 시 백엔드 오류
- **대응**: 백워드 호환성 유지, 점진적 마이그레이션

## 영향 범위 분석

### 직접 사용하는 컴포넌트
1. **페이지 컴포넌트**
   - `/pages/FileManagement.tsx` - PayrollExcelUploadWithPreview 직접 렌더링
   - `/pages/Payroll/PayrollExcelUpload.tsx` - PayrollExcelUploadWithPreview 직접 렌더링

2. **관련 컴포넌트**
   - `PayrollPreviewTable.tsx` - Props 인터페이스 변경 필요
   - `PayrollUploadSummary.tsx` - selectedRecords prop 추가 필요
   - `PayrollUnmatchedSection.tsx` - 기존 recordActions 로직과 통합

3. **서비스 레이어**
   - `/services/api.ts` - confirmPayrollExcel 메서드 (recordActions 파라미터 처리)
   - `/services/payrollService.ts` - API 호출 래퍼 함수

### 테스트 파일 영향
1. **컴포넌트 테스트**
   - `PayrollExcelUploadWithPreview.test.tsx` - 새로운 선택 기능 테스트 추가
   - `PayrollPreviewTable.test.tsx` - 체크박스 관련 테스트 추가
   - `PayrollErrorHandling.test.tsx` - 선택된 레코드만 처리하는 시나리오 테스트
   - `BrowserCompatibility.test.tsx` - 체크박스 이벤트 호환성 테스트

2. **서비스 테스트**
   - `payrollService.test.ts` - recordActions 파라미터 테스트 케이스 업데이트

### 백엔드 영향
- `/backend/routes/upload.js` - 이미 recordActions 처리 지원 (변경 불필요)
- 단, recordActions 배열 형식 검증 로직 확인 필요

## 회귀 테스트 체크리스트

### 기능 테스트
- [ ] 기존 파일 업로드 기능 정상 동작
- [ ] 미리보기 생성 정상 동작
- [ ] 중복 처리 모드 (skip/update) 정상 동작
- [ ] 수동 매칭 기능과 충돌 없음
- [ ] 토큰 만료 처리 정상 동작
- [ ] 에러 처리 및 재시도 로직 정상 동작

### UI/UX 테스트
- [ ] 파일 드래그 앤 드롭 정상 동작
- [ ] 프로그레스 바 정상 표시
- [ ] 에러 메시지 정상 표시
- [ ] 확인 다이얼로그 정상 동작
- [ ] 결과 화면 정상 표시

### 데이터 무결성
- [ ] 선택된 레코드만 DB에 저장
- [ ] 선택되지 않은 레코드는 skip 처리
- [ ] 수동 매칭된 레코드 정상 처리
- [ ] 중복 레코드 처리 옵션 정상 적용

### 성능 테스트
- [ ] 100개 이상 레코드 처리 시 UI 응답성
- [ ] 체크박스 전체 선택/해제 성능
- [ ] 대용량 파일 업로드 성능

## 구현 시 주의사항

### 1. Props 인터페이스 하위 호환성
```typescript
// PayrollPreviewTable - Optional props로 하위 호환성 유지
interface PayrollPreviewTableProps {
  records: PreviewRecord[];
  selectedRecords?: Set<number>;  // Optional
  onRecordSelectionChange?: (rowNumber: number, selected: boolean) => void;  // Optional
  onSelectAll?: (selected: boolean) => void;  // Optional
}
```

### 2. 기존 recordActions 로직 보존
- 수동 매칭 ('manual') 액션은 그대로 유지
- 선택 해제 시에만 'skip' 액션 추가
- 기존 백엔드 API와 완벽 호환

### 3. 테스트 커버리지
- 기존 테스트는 모두 통과해야 함
- 새로운 선택 기능 테스트 추가
- E2E 테스트로 전체 플로우 검증

## 완료 기준
- [ ] 체크박스로 개별 레코드 선택/해제 가능
- [ ] 유효한 레코드 기본 선택
- [ ] 선택된 레코드만 저장
- [ ] 명확한 사용자 피드백
- [ ] 기존 기능 정상 동작
- [ ] 모든 기존 테스트 통과
- [ ] 새로운 기능 테스트 추가 및 통과
- [ ] 회귀 테스트 체크리스트 완료