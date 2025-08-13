# 직원 매칭 간단 처리 계획

## 개요
Excel 급여 데이터 업로드 시 DB에 없는 직원에 대해 **수동 매칭** 또는 **건너뛰기** 옵션만 제공하는 심플한 해결 방안

## 문제 상황
- Excel 파일의 직원이 현재 DB에 없는 경우 (예: "Employee not found: 박태준")
- 입퇴사, 이름 오타 등으로 인한 매칭 실패

## 해결 방안: 심플한 2-옵션 시스템

### Phase 1: Backend 수정 (1일)

#### 1.1 Preview API 응답 수정
- [x] 각 레코드에 매칭 상태 추가
  ```javascript
  {
    record: {
      name: "박태준",
      salary: 3000000,
      // ... 기타 급여 데이터
    },
    matched: false,  // true: DB에 있음, false: DB에 없음
    userId: null,    // 매칭된 경우 실제 userId
    rowNumber: 6     // Excel 행 번호
  }
  ```

#### 1.2 전체 직원 목록 제공 엔드포인트
- [x] `/api/users/simple-list` - 매칭용 간단한 직원 목록
  ```javascript
  [
    { id: "user1", name: "김철수", department: "개발팀", employeeId: "2021001" },
    { id: "user2", name: "이영희", department: "인사팀", employeeId: "2021002" },
    // ...
  ]
  ```

#### 1.3 Confirm API 수정
- [x] 각 레코드별 처리 액션 받기
  ```javascript
  {
    previewToken: '...',
    recordActions: [
      { rowNumber: 1, action: 'process' },  // 자동 매칭된 건
      { rowNumber: 6, action: 'skip' },     // 건너뛰기
      { rowNumber: 7, action: 'manual', userId: 'user123' }  // 수동 매칭
    ]
  }
  ```

### Phase 2: Frontend UI 구현 (2일)

#### 2.1 프리뷰 테이블 개선
- [x] 매칭 상태 표시
  ```typescript
  // 매칭 상태 칩 컴포넌트
  {matched ? (
    <Chip label="매칭됨" color="success" size="small" />
  ) : (
    <Chip label="매칭 필요" color="warning" size="small" />
  )}
  ```

#### 2.2 매칭 실패 레코드 처리 UI
- [x] 매칭되지 않은 각 행에 대한 선택 옵션
  ```typescript
  interface UnmatchedRecordAction {
    rowNumber: number;
    excelName: string;
    action: 'skip' | 'manual';
    selectedUserId?: string;  // manual인 경우
  }
  ```

#### 2.3 매칭 선택 컴포넌트
- [x] 각 매칭 실패 행에 표시
  ```jsx
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
    <Typography>{record.name}</Typography>
    <Select 
      value={selectedAction}
      onChange={(e) => handleActionChange(rowNumber, e.target.value)}
      size="small"
    >
      <MenuItem value="skip">건너뛰기</MenuItem>
      <MenuItem value="manual">직원 선택</MenuItem>
    </Select>
    
    {selectedAction === 'manual' && (
      <Autocomplete
        options={employeeList}
        getOptionLabel={(option) => `${option.name} (${option.department})`}
        onChange={(e, value) => handleEmployeeSelect(rowNumber, value?.id)}
        size="small"
        sx={{ minWidth: 200 }}
      />
    )}
  </Box>
  ```

#### 2.4 요약 정보 표시
- [x] 상단에 처리 요약 표시
  ```jsx
  <Alert severity="info">
    총 {totalRecords}건 중:
    • 자동 매칭: {matchedCount}건
    • 수동 매칭 필요: {unmatchedCount}건
    • 건너뛰기 선택: {skipCount}건
  </Alert>
  ```

### Phase 3: 처리 로직 구현 (1일)

#### 3.1 Frontend 상태 관리
- [x] 매칭 액션 상태 관리
  ```typescript
  const [recordActions, setRecordActions] = useState<Map<number, RecordAction>>(new Map());
  
  // 액션 변경 핸들러
  const handleActionChange = (rowNumber: number, action: string) => {
    setRecordActions(prev => {
      const updated = new Map(prev);
      updated.set(rowNumber, { action, userId: null });
      return updated;
    });
  };
  ```

#### 3.2 Backend 처리 로직
- [x] Confirm 엔드포인트에서 액션별 처리
  ```javascript
  // routes/upload.js
  router.post('/excel/confirm', async (req, res) => {
    const { previewToken, recordActions } = req.body;
    const previewData = await getPreviewData(previewToken);
    
    const results = [];
    for (const record of previewData.records) {
      const action = recordActions.find(a => a.rowNumber === record.rowNumber);
      
      if (action?.action === 'skip') {
        results.push({ rowNumber: record.rowNumber, status: 'skipped' });
        continue;
      }
      
      if (action?.action === 'manual') {
        record.userId = action.userId;
      }
      
      // 급여 데이터 저장
      await savePayrollRecord(record);
      results.push({ rowNumber: record.rowNumber, status: 'saved' });
    }
    
    return res.json({ success: true, results });
  });
  ```

### Phase 4: 검증 및 피드백 (1일)

#### 4.1 유효성 검증
- [ ] 수동 매칭 시 중복 체크
- [ ] 모든 필수 레코드 처리 확인
- [ ] 건너뛴 레코드 이유 기록

#### 4.2 처리 결과 표시
- [ ] 처리 완료 후 결과 요약
  ```jsx
  <Alert severity="success">
    처리 완료:
    • 저장됨: {savedCount}건
    • 건너뜀: {skippedCount}건
    
    {skippedCount > 0 && (
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        건너뛴 직원: {skippedNames.join(', ')}
      </Typography>
    )}
  </Alert>
  ```

## 구현 예시

### 프리뷰 화면 UI
```
┌──────────────────────────────────────────────────────────┐
│ 📊 급여 데이터 프리뷰                                      │
├──────────────────────────────────────────────────────────┤
│ ℹ️ 총 10건 중: 자동 매칭 8건, 수동 처리 필요 2건           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 행 | 이름   | 급여    | 상태      | 처리 방법            │
│ ---|--------|---------|-----------|---------------------|
│ 1  | 김철수  | 3,000,000 | ✅ 매칭됨 | -                 │
│ 2  | 이영희  | 2,800,000 | ✅ 매칭됨 | -                 │
│ ...                                                       │
│ 6  | 박태준  | 3,200,000 | ⚠️ 미매칭 | [건너뛰기 ▼]      │
│    |        |         |           | [직원선택: _____ ] │
│ 7  | 최민수  | 2,900,000 | ⚠️ 미매칭 | [건너뛰기 ▼]      │
│    |        |         |           | [직원선택: _____ ] │
│                                                           │
│ [취소]                                    [확인 및 저장]  │
└──────────────────────────────────────────────────────────┘
```

## 주요 차이점 (기존 계획 대비)

### 제거된 기능
- ❌ 자동 유사 매칭 (Levenshtein distance 등)
- ❌ 새 직원 자동 생성
- ❌ 임시 직원 관리 시스템
- ❌ 매칭 히스토리 및 학습

### 유지된 핵심 기능
- ✅ 매칭 상태 시각화
- ✅ 수동 직원 선택
- ✅ 건너뛰기 옵션
- ✅ 처리 결과 요약

## 예상 코드 변경량
- Backend: 약 100줄 수정/추가
- Frontend: 약 200줄 수정/추가
- 총 작업 시간: 3-5일

## 장점
- **심플함**: 사용자가 이해하기 쉬움
- **정확성**: 수동 매칭으로 실수 방지
- **빠른 구현**: 1주일 내 완료 가능
- **유지보수 용이**: 복잡한 로직 없음

## 단점 및 대응
- **수동 작업 필요**: 하지만 정확성 보장
- **시간 소요**: 매칭 실패가 많으면 시간 소요 → 일반적으로 소수만 실패

## 구현 우선순위
1. Backend Preview API 수정 (매칭 상태 포함)
2. Frontend 매칭 선택 UI 구현
3. Confirm API 처리 로직
4. 테스트 및 검증

## 다음 단계
1. Backend API 수정 시작
2. Frontend 컴포넌트 개발
3. 통합 테스트