# Excel 급여업로드 프리뷰 기능 개발계획

## 🎯 개발 목표

현재는 Excel 파일을 업로드하면 바로 데이터베이스에 저장되는 구조를, **파일 내용을 먼저 확인한 후 사용자가 "확인" 버튼을 눌러야 DB에 저장되는** 2단계 프로세스로 변경

## 📋 현재 프로세스 vs 개선된 프로세스

### 현재 프로세스
```
파일 선택 → 업로드 버튼 클릭 → 즉시 DB 저장 → 결과 표시
```

### 개선된 프로세스
```
파일 선택 → 업로드 버튼 클릭 → 파일 파싱 & 프리뷰 표시 → 확인 버튼 클릭 → DB 저장 → 결과 표시
```

## 🏗️ 아키텍처 변경 계획

### 1. Backend API 구조 변경

#### 기존 API
- `POST /api/payroll/excel/upload` - 파일 업로드 및 즉시 DB 저장

#### 새로운 API 구조
```javascript
// 1단계: 파일 파싱 및 프리뷰 데이터 반환
POST /api/payroll/excel/preview
- 파일을 파싱하여 데이터 구조 확인
- 직원 매칭 상태 검증
- 에러 및 경고사항 체크
- 임시 파일 저장 (세션/토큰 기반)
- 프리뷰 데이터 반환 (DB 저장 X)

// 2단계: 확인된 데이터를 실제 DB에 저장
POST /api/payroll/excel/confirm
- 1단계에서 파싱된 데이터를 DB에 저장
- 임시 파일 정리
- 최종 저장 결과 반환
```

### 2. Frontend 컴포넌트 구조 변경

#### 새로운 UI 상태 관리
```typescript
interface UploadState {
  step: 'select' | 'preview' | 'confirmed' | 'completed';
  selectedFile: File | null;
  previewData: PreviewData | null;
  previewToken: string | null; // 임시 데이터 식별용
  uploading: boolean;
  confirming: boolean;
  result: UploadResult | null;
  error: string | null;
}

interface PreviewData {
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    warningRecords: number;
  };
  records: PreviewRecord[];
  errors: PreviewError[];
  warnings: PreviewWarning[];
}

interface PreviewRecord {
  rowIndex: number;
  employeeName: string;
  employeeId?: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  matchedUser: {
    found: boolean;
    userId?: string;
    name?: string;
    employeeId?: string;
  };
  status: 'valid' | 'invalid' | 'warning';
}
```

## 🔧 구체적 구현 계획

### Phase 1: Backend API 분리

#### 1.1 프리뷰 API 개발 (`/api/payroll/excel/preview`)

```javascript
// 새로운 라우터 추가: /backend/routes/payroll-enhanced.js
router.post('/excel/preview', 
  requireAuth, 
  requirePermission('payroll:manage'),
  strictRateLimiter,
  preventNoSQLInjection,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    // 1. 파일 파싱 (기존 로직 재사용)
    // 2. 직원 매칭 검증 (DB 조회하지만 저장하지 않음)
    // 3. 에러/경고 분석
    // 4. 임시 파일 및 메타데이터 저장
    // 5. 프리뷰 데이터 반환
  })
);
```

**주요 처리 로직:**
- Excel 파일 파싱 (기존 `LaborConsultantParser` 재사용)
- 직원 매칭 상태 확인 (users 컬렉션 조회)
- 중복 급여 기록 체크 (payroll 컬렉션 조회)
- 임시 토큰 생성 및 파싱 결과 임시 저장
- 프리뷰용 데이터 구조 생성

#### 1.2 확인 API 개발 (`/api/payroll/excel/confirm`)

```javascript
router.post('/excel/confirm',
  requireAuth,
  requirePermission('payroll:manage'),
  preventNoSQLInjection,
  asyncHandler(async (req, res) => {
    // 1. 프리뷰 토큰 검증
    // 2. 임시 저장된 파싱 데이터 로드
    // 3. 실제 DB 저장 (기존 로직)
    // 4. 임시 데이터 정리
    // 5. 최종 결과 반환
  })
);
```

#### 1.3 임시 데이터 관리

```javascript
// 임시 데이터 저장 구조 (Redis 또는 메모리)
const tempStorageKey = `payroll_preview_${userId}_${timestamp}`;
const tempData = {
  parsedRecords: [...],
  fileName: 'original_file.xlsx',
  uploadedBy: userId,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30분 후 만료
};

// 메모리 기반 임시 저장 (Redis 없는 경우)
const tempStorage = new Map();
```

### Phase 2: Frontend 컴포넌트 개선

#### 2.1 PayrollExcelUpload 컴포넌트 리팩토링

```typescript
// 새로운 컴포넌트 구조
export const PayrollExcelUpload: React.FC = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    step: 'select',
    selectedFile: null,
    previewData: null,
    previewToken: null,
    // ...
  });

  // 1단계: 파일 프리뷰 처리
  const handlePreview = async () => {
    // POST /api/payroll/excel/preview 호출
    // 프리뷰 데이터 및 토큰 저장
    // step을 'preview'로 변경
  };

  // 2단계: 실제 저장 확인
  const handleConfirm = async () => {
    // POST /api/payroll/excel/confirm 호출
    // 최종 결과 처리
    // step을 'completed'로 변경
  };

  // 단계별 렌더링
  return (
    <Box>
      {uploadState.step === 'select' && <FileSelectStep />}
      {uploadState.step === 'preview' && <PreviewStep />}
      {uploadState.step === 'completed' && <ResultStep />}
    </Box>
  );
};
```

#### 2.2 새로운 프리뷰 컴포넌트 추가

```typescript
// 프리뷰 단계 전용 컴포넌트
const PreviewStep: React.FC<PreviewStepProps> = ({ previewData, onConfirm, onCancel }) => {
  return (
    <Box>
      {/* 요약 정보 */}
      <PreviewSummaryCard summary={previewData.summary} />
      
      {/* 데이터 테이블 */}
      <PreviewDataTable records={previewData.records} />
      
      {/* 에러/경고 목록 */}
      {previewData.errors.length > 0 && (
        <PreviewErrorList errors={previewData.errors} />
      )}
      
      {/* 액션 버튼 */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="outlined" onClick={onCancel}>
          취소
        </Button>
        <Button 
          variant="contained" 
          onClick={onConfirm}
          disabled={previewData.summary.invalidRecords > 0}
        >
          데이터베이스에 저장
        </Button>
      </Box>
    </Box>
  );
};
```

#### 2.3 프리뷰 데이터 테이블

```typescript
const PreviewDataTable: React.FC = ({ records }) => {
  const columns = [
    { field: 'rowIndex', headerName: '행', width: 70 },
    { field: 'employeeName', headerName: '직원명', width: 120 },
    { field: 'employeeId', headerName: '사번', width: 100 },
    { 
      field: 'matchedUser.found', 
      headerName: '매칭 상태', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value ? '매칭됨' : '매칭 실패'} 
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      )
    },
    { field: 'baseSalary', headerName: '기본급', width: 120, type: 'number' },
    { field: 'totalAllowances', headerName: '총 수당', width: 120, type: 'number' },
    { field: 'totalDeductions', headerName: '총 공제', width: 120, type: 'number' },
    { field: 'netSalary', headerName: '실수령액', width: 130, type: 'number' },
    {
      field: 'status',
      headerName: '상태',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'valid' ? 'success' :
            params.value === 'warning' ? 'warning' : 'error'
          }
          size="small"
        />
      )
    }
  ];

  return (
    <DataGrid
      rows={records}
      columns={columns}
      pageSize={10}
      checkboxSelection={false}
      disableRowSelectionOnClick
      autoHeight
    />
  );
};
```

### Phase 3: API Service 업데이트

```typescript
// frontend/src/services/api.ts
class ApiService {
  // 기존 메서드 분리
  async previewPayrollExcel(file: File): Promise<ApiResponse<PreviewData>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/payroll/excel/preview`, {
      method: 'POST',
      headers: this.getHeaders(false), // Content-Type 제외
      body: formData,
    });
    
    return this.handleResponse(response);
  }

  async confirmPayrollExcel(previewToken: string): Promise<ApiResponse<UploadResult>> {
    const response = await fetch(`${this.baseUrl}/payroll/excel/confirm`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ previewToken }),
    });
    
    return this.handleResponse(response);
  }

  // 기존 메서드 유지 (하위 호환성)
  async uploadPayrollExcel(file: File): Promise<ApiResponse<UploadResult>> {
    console.warn('uploadPayrollExcel is deprecated. Use previewPayrollExcel + confirmPayrollExcel');
    // 기존 구현 유지하거나 새로운 2단계 프로세스로 내부 변환
  }
}
```

## 🧪 테스트 계획

### Backend 테스트

```javascript
// tests/integration/payroll-excel-preview.test.js
describe('Excel Payroll Preview API', () => {
  test('should return preview data without saving to database', async () => {
    // 테스트 Excel 파일 업로드
    // 프리뷰 데이터 검증
    // DB에 저장되지 않았는지 확인
  });

  test('should validate employee matching in preview', async () => {
    // 존재하지 않는 직원 포함 파일 테스트
    // 매칭 실패 상태 확인
  });

  test('should detect duplicate payroll records in preview', async () => {
    // 이미 존재하는 급여 기록 테스트
    // 중복 경고 표시 확인
  });
});

describe('Excel Payroll Confirm API', () => {
  test('should save data to database after preview confirmation', async () => {
    // 프리뷰 → 확인 → DB 저장 플로우 테스트
  });

  test('should clean up temporary data after confirmation', async () => {
    // 임시 데이터 정리 확인
  });
});
```

### Frontend 테스트

```typescript
// tests/components/PayrollExcelUpload.test.tsx
describe('PayrollExcelUpload with Preview', () => {
  test('should show preview step after file upload', async () => {
    // 파일 선택 → 업로드 → 프리뷰 표시 확인
  });

  test('should display preview data table correctly', async () => {
    // 프리뷰 데이터 테이블 렌더링 확인
  });

  test('should disable confirm button when errors exist', async () => {
    // 에러가 있는 경우 확인 버튼 비활성화 확인
  });

  test('should complete upload after confirmation', async () => {
    // 확인 버튼 클릭 → 최종 저장 완료 확인
  });
});
```

## 📊 데이터베이스 영향도

### 변경사항
- **기존 payroll 컬렉션**: 변경 없음
- **새로운 임시 저장소**: 메모리 기반 또는 새로운 temp_uploads 컬렉션
- **기존 API 호환성**: 유지 (deprecated 표시)

### 임시 데이터 구조
```javascript
// temp_uploads 컬렉션 (선택사항)
{
  _id: ObjectId,
  token: String,           // 고유 식별자
  userId: ObjectId,        // 업로드한 사용자
  fileName: String,
  parsedData: Array,       // 파싱된 급여 데이터
  previewData: Object,     // 프리뷰용 요약 정보
  createdAt: Date,
  expiresAt: Date,         // 30분 후 자동 만료
  status: String           // 'pending', 'confirmed', 'expired'
}
```

## 🚨 에러 처리 및 사용자 경험

### 예상 에러 시나리오
1. **파일 파싱 실패**: 잘못된 Excel 형식
2. **직원 매칭 실패**: 시스템에 등록되지 않은 직원
3. **중복 데이터**: 이미 존재하는 급여 기록
4. **권한 없음**: Admin 권한이 없는 사용자 접근
5. **네트워크 오류**: 업로드 중 연결 끊김

### 사용자 피드백
```typescript
interface UserFeedback {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}

// 예시
const feedback = {
  type: 'warning',
  title: '일부 직원 매칭 실패',
  message: '3명의 직원을 시스템에서 찾을 수 없습니다. 계속 진행하시겠습니까?',
  actions: [
    { label: '직원 등록하기', handler: () => navigateToUserManagement() },
    { label: '무시하고 계속', handler: () => proceedWithWarnings() }
  ]
};
```

## 🔄 마이그레이션 전략

### 단계적 배포
1. **Phase 1**: Backend API 추가 (기존 API 유지)
2. **Phase 2**: Frontend 새로운 UI 추가 (기존 UI와 병행)
3. **Phase 3**: 기존 API deprecated 표시
4. **Phase 4**: 기존 API 제거 (6개월 후)

### 하위 호환성
- 기존 `/excel/upload` API 6개월간 유지
- 새로운 2단계 프로세스를 기본으로 설정
- 환경 변수로 기존/신규 방식 전환 가능

## 📅 개발 일정

### Week 1: Backend API 개발
- [ ] `/excel/preview` API 구현
- [ ] `/excel/confirm` API 구현
- [ ] 임시 데이터 저장소 구현
- [ ] 기본 테스트 작성

### Week 2: Frontend 컴포넌트 개발
- [ ] UploadState 상태 관리 구현
- [ ] PreviewStep 컴포넌트 개발
- [ ] PreviewDataTable 컴포넌트 개발
- [ ] API Service 업데이트

### Week 3: 통합 테스트 및 UI/UX 개선
- [ ] 전체 플로우 통합 테스트
- [ ] 에러 처리 및 사용자 피드백 개선
- [ ] 반응형 디자인 적용
- [ ] 성능 최적화

### Week 4: 배포 및 모니터링
- [ ] 스테이징 환경 배포
- [ ] 사용자 테스트 및 피드백 수집
- [ ] 프로덕션 배포
- [ ] 모니터링 및 버그 수정

## 💡 추가 개선 사항

### 향후 고려할 기능들
1. **일괄 편집**: 프리뷰에서 직접 데이터 수정
2. **템플릿 검증**: 업로드 전 Excel 구조 검증
3. **진행률 표시**: 대용량 파일 처리 시 상세 진행률
4. **자동 백업**: 원본 Excel 파일 자동 보관
5. **변경 히스토리**: 데이터 변경 추적 및 롤백

### 성능 최적화
1. **청크 단위 처리**: 대용량 파일을 청크별로 분할 처리
2. **캐싱**: 파싱 결과 캐싱으로 재처리 시간 단축
3. **압축**: 임시 데이터 압축 저장
4. **비동기 처리**: Web Worker를 통한 파일 파싱

## 🎯 성공 지표

### 사용자 경험 개선
- [ ] 업로드 오류율 50% 감소
- [ ] 사용자 피드백 점수 4.5/5 이상
- [ ] 데이터 정확도 99% 이상 달성

### 시스템 안정성
- [ ] API 응답 시간 2초 이하 유지
- [ ] 메모리 사용량 20% 이내 증가
- [ ] 에러 발생률 1% 이하 유지

## ⚠️ 예상되는 문제점 및 해결방안

### 1. 임시 데이터 관리 문제

#### 1.1 메모리 부족 문제
**문제**: 
- 대용량 Excel 파일 여러 개를 동시에 프리뷰하면 서버 메모리 부족 발생
- Node.js 기본 메모리 제한(1.7GB)으로 인한 서비스 중단

**해결방안**:
```javascript
// 메모리 사용량 모니터링 및 제한
const MAX_MEMORY_PER_USER = 50 * 1024 * 1024; // 50MB per user
const MAX_TOTAL_MEMORY = 500 * 1024 * 1024; // 500MB total

// 파일 크기별 처리 전략
if (fileSize > 10 * 1024 * 1024) { // 10MB 이상
  // 파일 시스템 기반 임시 저장
  await saveToTempFile(parsedData);
} else {
  // 메모리 기반 임시 저장
  tempStorage.set(token, parsedData);
}
```

#### 1.2 서버 재시작 시 데이터 손실
**문제**: 
- 메모리 기반 저장 시 서버 재시작/크래시로 프리뷰 데이터 손실
- 사용자가 프리뷰 중이던 작업을 처음부터 다시 시작해야 함

**해결방안**:
- Redis 또는 MongoDB temp_uploads 컬렉션 사용
- 파일 시스템 기반 임시 저장 (/tmp 디렉토리)
- 클라이언트 측 로컬 스토리지 백업

#### 1.3 임시 데이터 정리 실패
**문제**:
- 만료된 임시 데이터가 정리되지 않아 저장 공간 부족
- 사용자가 프리뷰만 하고 확인/취소 없이 이탈

**해결방안**:
```javascript
// 자동 정리 스케줄러
const cleanupScheduler = setInterval(async () => {
  const expiredTokens = await findExpiredTokens();
  for (const token of expiredTokens) {
    await cleanupTempData(token);
  }
}, 5 * 60 * 1000); // 5분마다 실행

// MongoDB TTL 인덱스 활용
db.temp_uploads.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
```

### 2. 보안 및 권한 문제

#### 2.1 민감한 급여 데이터 노출
**문제**:
- 프리뷰 API 응답에 모든 급여 정보가 포함되어 네트워크 스니핑 위험
- 브라우저 개발자 도구에서 데이터 확인 가능

**해결방안**:
- HTTPS 필수 적용
- 민감한 정보 마스킹 처리
- 프리뷰 데이터 암호화
```javascript
// 민감 정보 마스킹
const maskedPreview = {
  ...previewData,
  records: previewData.records.map(record => ({
    ...record,
    baseSalary: maskNumber(record.baseSalary), // "3,***,***원"
    netSalary: maskNumber(record.netSalary),
    // 실제 값은 서버에만 보관
  }))
};
```

#### 2.2 CSRF 공격 및 토큰 탈취
**문제**:
- 프리뷰 토큰이 탈취되면 타인이 급여 데이터 저장 가능
- Cross-Site Request Forgery 공격 위험

**해결방안**:
```javascript
// 토큰에 사용자 정보 및 시간 제한 포함
const previewToken = jwt.sign({
  userId: req.user.id,
  fileHash: calculateHash(fileContent),
  expiresAt: Date.now() + 30 * 60 * 1000,
  csrfToken: generateCSRFToken()
}, SECRET_KEY);

// 확인 시 검증
const verifyToken = (token, userId, csrfToken) => {
  const decoded = jwt.verify(token, SECRET_KEY);
  if (decoded.userId !== userId || decoded.csrfToken !== csrfToken) {
    throw new Error('Invalid token');
  }
};
```

### 3. 성능 및 확장성 문제

#### 3.1 대용량 파일 처리 타임아웃
**문제**:
- 수천 건 이상의 데이터 파싱 시 API 타임아웃 (30초 제한)
- 브라우저 요청 타임아웃으로 인한 실패

**해결방안**:
```javascript
// 스트리밍 파싱 및 청크 처리
const parseInChunks = async (filePath, chunkSize = 100) => {
  const stream = new ExcelStream(filePath);
  const chunks = [];
  
  stream.on('data', (chunk) => {
    chunks.push(chunk);
    if (chunks.length >= chunkSize) {
      await processChunk(chunks);
      chunks.length = 0;
    }
  });
};

// 진행률 SSE (Server-Sent Events) 전송
const sendProgress = (res, progress) => {
  res.write(`data: ${JSON.stringify({ progress })}\n\n`);
};
```

#### 3.2 동시 다발적 업로드 처리
**문제**:
- 여러 관리자가 동시에 대용량 파일 업로드 시 서버 과부하
- CPU/메모리 스파이크로 인한 서비스 품질 저하

**해결방안**:
```javascript
// 동시 처리 제한 (Queue 시스템)
const uploadQueue = new Queue({
  concurrency: 3, // 동시 3개까지만 처리
  timeout: 60000  // 60초 타임아웃
});

// Rate limiting 강화
const stricterRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5, // 5분당 5회로 제한
  message: '너무 많은 업로드 시도입니다. 잠시 후 다시 시도해주세요.'
});
```

### 4. 사용자 경험 (UX) 문제

#### 4.1 브라우저 뒤로가기/새로고침 문제
**문제**:
- 프리뷰 단계에서 뒤로가기 시 작업 내용 손실
- 실수로 새로고침하면 처음부터 다시 시작

**해결방안**:
```javascript
// 브라우저 이탈 경고
window.addEventListener('beforeunload', (e) => {
  if (uploadState.step === 'preview' && !uploadState.confirmed) {
    e.preventDefault();
    e.returnValue = '프리뷰 데이터가 저장되지 않았습니다. 정말 나가시겠습니까?';
  }
});

// 상태 복원 (SessionStorage 활용)
const saveStateToSession = (state) => {
  sessionStorage.setItem('payrollUploadState', JSON.stringify({
    ...state,
    timestamp: Date.now()
  }));
};

const restoreStateFromSession = () => {
  const saved = sessionStorage.getItem('payrollUploadState');
  if (saved) {
    const state = JSON.parse(saved);
    if (Date.now() - state.timestamp < 30 * 60 * 1000) { // 30분 이내
      return state;
    }
  }
  return null;
};
```

#### 4.2 중복 제출 방지
**문제**:
- 사용자가 확인 버튼을 여러 번 클릭하여 중복 저장
- 네트워크 지연으로 인한 재시도

**해결방안**:
```javascript
// Frontend: 버튼 비활성화 및 로딩 상태
const [isSubmitting, setIsSubmitting] = useState(false);

const handleConfirm = async () => {
  if (isSubmitting) return; // 이미 처리 중
  
  setIsSubmitting(true);
  try {
    await confirmUpload();
  } finally {
    setIsSubmitting(false);
  }
};

// Backend: Idempotency key 사용
const idempotencyKey = `${userId}_${fileHash}_${timestamp}`;
if (await checkIdempotencyKey(idempotencyKey)) {
  return res.status(409).json({ error: '이미 처리된 요청입니다.' });
}
```

### 5. 데이터 일관성 문제

#### 5.1 프리뷰와 저장 사이 데이터 변경
**문제**:
- 프리뷰 후 확인 전에 다른 관리자가 직원 정보 변경
- 급여 마스터 데이터 변경으로 계산 결과 불일치

**해결방안**:
```javascript
// 데이터 버전 관리
const previewSnapshot = {
  dataVersion: await getDataVersion(),
  userSnapshots: await captureUserSnapshots(userIds),
  timestamp: Date.now()
};

// 확인 시 버전 체크
const currentVersion = await getDataVersion();
if (currentVersion !== previewSnapshot.dataVersion) {
  return res.status(409).json({
    error: '데이터가 변경되었습니다. 다시 프리뷰해주세요.',
    changes: await getChangedData(previewSnapshot)
  });
}
```

#### 5.2 부분 실패 처리
**문제**:
- 100건 중 50건 저장 후 오류 발생 시 데이터 불일치
- 롤백 처리 복잡성

**해결방안**:
```javascript
// MongoDB Transaction 사용
const session = await mongoose.startSession();
session.startTransaction();

try {
  for (const record of records) {
    await savePayrollRecord(record, { session });
  }
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}

// 부분 성공 허용 모드
const results = await Promise.allSettled(
  records.map(record => savePayrollRecord(record))
);
const succeeded = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

### 6. 운영 및 모니터링 문제

#### 6.1 디버깅 어려움
**문제**:
- 프리뷰 → 확인 과정에서 문제 발생 시 추적 어려움
- 임시 데이터 상태 파악 불가

**해결방안**:
```javascript
// 상세 로깅 시스템
const logger = {
  preview: (token, userId, fileName) => {
    console.log({
      action: 'PAYROLL_PREVIEW',
      token,
      userId,
      fileName,
      timestamp: new Date(),
      memory: process.memoryUsage()
    });
  },
  confirm: (token, result) => {
    console.log({
      action: 'PAYROLL_CONFIRM',
      token,
      result,
      timestamp: new Date()
    });
  }
};

// 관리자용 디버그 API
router.get('/excel/debug/:token', 
  requireAuth,
  requirePermission('system:admin'),
  async (req, res) => {
    const debugInfo = await getDebugInfo(req.params.token);
    res.json(debugInfo);
  }
);
```

#### 6.2 용량 관리 및 제한
**문제**:
- 임시 저장 공간 부족
- 예상치 못한 대용량 파일 업로드

**해결방안**:
```javascript
// 동적 용량 관리
const storageManager = {
  checkAvailableSpace: async () => {
    const used = await calculateTempStorageUsage();
    const limit = process.env.TEMP_STORAGE_LIMIT || 1024 * 1024 * 1024; // 1GB
    return limit - used;
  },
  
  enforceQuota: async (userId) => {
    const userUsage = await getUserTempStorageUsage(userId);
    const userLimit = 100 * 1024 * 1024; // 100MB per user
    if (userUsage > userLimit) {
      await cleanupOldestUserFiles(userId);
    }
  }
};
```

### 7. 호환성 및 마이그레이션 문제

#### 7.1 기존 시스템과의 충돌
**문제**:
- 기존 단일 API 사용 코드와의 호환성
- 외부 시스템 연동 영향

**해결방안**:
```javascript
// Adapter 패턴으로 호환성 유지
router.post('/excel/upload', async (req, res) => {
  if (process.env.USE_PREVIEW_MODE === 'true') {
    // 새로운 2단계 프로세스 자동 실행
    const preview = await handlePreview(req);
    const result = await handleConfirm(preview.token);
    return res.json(result);
  } else {
    // 기존 로직 유지
    return legacyUploadHandler(req, res);
  }
});
```

#### 7.2 점진적 전환 어려움
**문제**:
- 일부 사용자만 새 기능 사용 시 혼란
- A/B 테스트 구현 복잡성

**해결방안**:
```javascript
// Feature Flag 시스템
const featureFlags = {
  enablePreviewMode: (userId) => {
    // 특정 사용자 그룹만 활성화
    const betaUsers = process.env.BETA_USERS?.split(',') || [];
    return betaUsers.includes(userId) || 
           process.env.PREVIEW_MODE === 'all';
  }
};

// UI에서 조건부 렌더링
const UploadComponent = () => {
  const { user } = useAuth();
  const usePreviewMode = featureFlags.enablePreviewMode(user.id);
  
  return usePreviewMode ? 
    <PayrollExcelUploadWithPreview /> : 
    <PayrollExcelUploadLegacy />;
};
```

이 계획을 통해 사용자는 Excel 데이터를 미리 확인하고 검증한 후 안전하게 데이터베이스에 저장할 수 있게 되어, 데이터 품질과 사용자 신뢰도를 크게 향상시킬 수 있습니다.