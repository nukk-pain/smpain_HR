# UnifiedLeaveOverview Excel 내보내기 API 구현 계획 (TDD)

## 개요
UnifiedLeaveOverview 컴포넌트의 Excel 내보내기 기능을 TDD 방식으로 구현합니다. 기존 PayrollExcelService의 패턴을 참고하여 일관성 있는 구현을 진행합니다.

## 현재 상태 분석
- **기존 Excel 인프라**: PayrollExcelService (exceljs 사용)
- **내보내기 placeholder**: UnifiedLeaveOverview.tsx의 `handleExportToExcel` 함수
- **기존 패턴**: Payroll Excel export 구현 참조
- **보안 미들웨어**: requireAuth, requireAdmin 활용

## 기술 스택
- Backend: Node.js + Express + exceljs (이미 설치됨)
- Frontend: React + TypeScript
- Testing: Jest + Supertest (Backend), Vitest (Frontend)

## TDD 개발 사이클

### Phase 1: Backend API 엔드포인트 생성 (RED)

#### Test 1: API 엔드포인트 인증 확인
```javascript
// backend/tests/leave-excel-export.test.js
const request = require('supertest');
const app = require('../app');

describe('Leave Excel Export API', () => {
  describe('GET /api/leave/admin/export/excel', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/leave/admin/export/excel')
        .expect(401);
    });
  });
});
```

### Phase 2: 인증 및 권한 구현 (GREEN)

#### Test 2: Admin 권한 확인
```javascript
it('should return 403 when user is not admin', async () => {
  const userToken = await getUserToken(); // 일반 사용자 토큰
  const response = await request(app)
    .get('/api/leave/admin/export/excel')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(403);
});

it('should return 200 when user is admin', async () => {
  const adminToken = await getAdminToken();
  const response = await request(app)
    .get('/api/leave/admin/export/excel')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
});
```

**구현**: 
```javascript
// backend/routes/leaveAdmin.js
router.get('/export/excel', requireAuth, requireAdmin, async (req, res) => {
  res.status(200).json({ message: 'Excel export endpoint' });
});
```

### Phase 3: Excel 데이터 구조 테스트 (RED)

#### Test 3: Excel 파일 응답 형식
```javascript
it('should return Excel file with correct content type', async () => {
  const adminToken = await getAdminToken();
  const response = await request(app)
    .get('/api/leave/admin/export/excel?view=overview&year=2025')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
    .expect('Content-Type', /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
    
  expect(response.headers['content-disposition'])
    .toMatch(/attachment; filename\*=UTF-8''.*\.xlsx/);
});
```

### Phase 4: LeaveExcelService 구현 (GREEN)

#### Test 4: 데이터 구조 검증
```javascript
it('should export correct data structure for overview view', async () => {
  // 테스트 데이터 생성
  await createTestLeaveData();
  
  const adminToken = await getAdminToken();
  const response = await request(app)
    .get('/api/leave/admin/export/excel?view=overview&year=2025')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
    
  // Excel 파일 파싱
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.body);
  const worksheet = workbook.getWorksheet(1);
  
  // 헤더 확인
  const headers = worksheet.getRow(1).values;
  expect(headers).toContain('이름');
  expect(headers).toContain('부서');
  expect(headers).toContain('총 연차');
  expect(headers).toContain('사용');
  expect(headers).toContain('잔여');
  expect(headers).toContain('위험도');
});
```

**구현**:
```javascript
// backend/services/LeaveExcelService.js
class LeaveExcelService {
  async generateLeaveOverviewExcel(data, viewType, year) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`휴가현황_${year}`);
    
    // 기존 PayrollExcelService 패턴 참조
    this.addHeaders(worksheet, viewType);
    this.addData(worksheet, data, viewType);
    this.applyStyles(worksheet);
    
    return workbook;
  }
}
```

### Phase 5: Frontend API 서비스 테스트 (RED)

#### Test 5: API 서비스 메서드
```typescript
// frontend/src/services/api.test.ts
describe('exportLeaveToExcel', () => {
  it('should call correct endpoint with parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob())
    });
    global.fetch = mockFetch;
    
    await api.exportLeaveToExcel({
      view: 'overview',
      year: 2025,
      department: '개발팀'
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/leave/admin/export/excel?view=overview&year=2025&department=개발팀'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer')
        })
      })
    );
  });
});
```

### Phase 6: Frontend API 구현 (GREEN)

**구현**:
```typescript
// frontend/src/services/api.ts
export const exportLeaveToExcel = async (params: {
  view: 'overview' | 'team' | 'department';
  year: number;
  department?: string;
  riskLevel?: string;
}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('view', params.view);
  queryParams.append('year', params.year.toString());
  if (params.department) queryParams.append('department', params.department);
  if (params.riskLevel) queryParams.append('riskLevel', params.riskLevel);
  
  const response = await fetch(`${API_BASE_URL}/leave/admin/export/excel?${queryParams}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) throw new Error('Export failed');
  
  const blob = await response.blob();
  const filename = getFilenameFromResponse(response) || `leave-overview-${params.year}.xlsx`;
  downloadBlob(blob, filename);
};
```

### Phase 7: Component 통합 테스트 (RED → GREEN → REFACTOR)

#### Test 7: Export 버튼 동작
```typescript
// frontend/src/components/UnifiedLeaveOverview.export.test.tsx
describe('UnifiedLeaveOverview Export', () => {
  it('should trigger export when button clicked', async () => {
    const mockExport = vi.fn();
    vi.spyOn(api, 'exportLeaveToExcel').mockImplementation(mockExport);
    
    const { getByText } = render(
      <AuthProvider initialUser={{ userId: 'admin', role: 'Admin' }}>
        <UnifiedLeaveOverview />
      </AuthProvider>
    );
    
    const exportButton = getByText('Excel로 내보내기');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExport).toHaveBeenCalledWith({
        view: 'overview',
        year: expect.any(Number),
        department: undefined,
        riskLevel: undefined
      });
    });
  });
  
  it('should show loading state during export', async () => {
    vi.spyOn(api, 'exportLeaveToExcel').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    const { getByText, queryByRole } = render(
      <AuthProvider initialUser={{ userId: 'admin', role: 'Admin' }}>
        <UnifiedLeaveOverview />
      </AuthProvider>
    );
    
    const exportButton = getByText('Excel로 내보내기');
    fireEvent.click(exportButton);
    
    // 로딩 상태 확인
    expect(exportButton).toBeDisabled();
    expect(queryByRole('progressbar')).toBeInTheDocument();
  });
});
```

**구현**:
```typescript
// frontend/src/components/UnifiedLeaveOverview.tsx
const handleExportToExcel = async () => {
  try {
    setExportLoading(true);
    await api.exportLeaveToExcel({
      view: activeTab as 'overview' | 'team' | 'department',
      year: selectedYear,
      department: filters.department || undefined,
      riskLevel: filters.riskLevel || undefined
    });
    
    setSnackbar({
      open: true,
      message: 'Excel 파일이 다운로드되었습니다.',
      severity: 'success'
    });
  } catch (error) {
    console.error('Excel export failed:', error);
    setSnackbar({
      open: true,
      message: 'Excel 내보내기에 실패했습니다.',
      severity: 'error'
    });
  } finally {
    setExportLoading(false);
  }
};
```

### Phase 8: 권한별 접근 제어 테스트

#### Test 8: Supervisor 권한 제한
```javascript
it('should restrict export based on user role and view type', async () => {
  const supervisorToken = await getSupervisorToken();
  
  // Overview 뷰는 Admin만 가능
  await request(app)
    .get('/api/leave/admin/export/excel?view=overview')
    .set('Authorization', `Bearer ${supervisorToken}`)
    .expect(403);
    
  // Team 뷰는 Supervisor도 가능
  await request(app)
    .get('/api/leave/admin/export/excel?view=team')
    .set('Authorization', `Bearer ${supervisorToken}`)
    .expect(200);
});
```

### Phase 9: 고급 기능 테스트

#### Test 9: 다양한 내보내기 형식
```javascript
it('should support different export formats', async () => {
  const adminToken = await getAdminToken();
  
  // 상세 데이터 포함
  const detailedResponse = await request(app)
    .get('/api/leave/admin/export/excel?view=overview&detailed=true')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
    
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(detailedResponse.body);
  
  // 추가 시트 확인
  expect(workbook.worksheets.length).toBeGreaterThan(1);
  expect(workbook.getWorksheet('상세내역')).toBeDefined();
});
```

## 파일 구조

```
backend/
├── routes/
│   └── leaveAdmin.js (수정 - export 라우트 추가)
├── services/
│   └── LeaveExcelService.js (신규)
├── tests/
│   └── leave-excel-export.test.js (신규)
└── utils/
    └── excelHelpers.js (기존 활용)

frontend/
├── src/
│   ├── services/
│   │   └── api.ts (수정 - exportLeaveToExcel 추가)
│   ├── components/
│   │   └── UnifiedLeaveOverview.tsx (수정 - handleExportToExcel 구현)
│   └── test/
│       └── UnifiedLeaveOverview.export.test.tsx (신규)
```

## 구현 체크리스트

### Backend
- [x] Test 1: 인증되지 않은 요청 거부 (401) ✅
- [x] Test 2: Admin이 아닌 사용자 거부 (403) ✅
- [x] Test 3: Excel 파일 응답 형식 확인 (테스트 작성됨)
- [ ] Test 4: Overview 뷰 데이터 구조 🔄 진행중
- [ ] Test 5: Team 뷰 데이터 구조
- [ ] Test 6: Department 뷰 데이터 구조
- [ ] Test 7: 필터링 (연도, 부서, 위험도)
- [ ] Test 8: 한글 파일명 인코딩
- [ ] Test 9: 스타일링 (헤더, 위험도 색상)

### Frontend
- [ ] Test 1: API 서비스 메서드 호출
- [ ] Test 2: 파일 다운로드 처리
- [ ] Test 3: Export 버튼 클릭 이벤트
- [ ] Test 4: 로딩 상태 표시
- [ ] Test 5: 에러 처리
- [ ] Test 6: 필터 상태 전달

### Integration
- [ ] Test 1: Admin 전체 프로세스
- [ ] Test 2: Supervisor 제한된 접근
- [ ] Test 3: 대용량 데이터 처리
- [ ] Test 4: 동시 요청 처리

## 주요 고려사항

1. **기존 패턴 활용**
   - PayrollExcelService의 구조 참조
   - 동일한 스타일링 및 포맷 적용
   - 한글 파일명 인코딩 패턴 재사용

2. **보안**
   - requireAuth, requireAdmin 미들웨어 사용
   - 뷰 타입별 권한 체크
   - 민감한 데이터 필터링

3. **성능**
   - 스트리밍 대신 메모리 처리 (데이터 크기 작음)
   - 필요시 페이징 고려

4. **사용성**
   - 명확한 로딩 상태 표시
   - 에러 메시지 한글화
   - 필터 상태 유지

## 완료 기준

- [ ] 모든 테스트 통과 (Backend 9개, Frontend 6개, Integration 4개)
- [ ] TypeScript 컴파일 오류 없음
- [ ] FUNCTIONS_VARIABLES.md 업데이트
- [ ] TEST_GUIDE.md에 수동 테스트 시나리오 추가
- [ ] 코드 리뷰 및 리팩토링 완료

## 예상 일정

1. **Day 1**: Phase 1-2 (Backend 기본 구조) ✅ 완료
2. **Day 2**: Phase 3-4 (Excel 서비스 구현) 🔄 진행중
3. **Day 3**: Phase 5-6 (Frontend API 통합)
4. **Day 4**: Phase 7-8 (Component 통합 및 권한)
5. **Day 5**: Phase 9 및 통합 테스트

## 진행 상황 (2025.08.20)

### 완료된 작업
1. **Backend API 엔드포인트 설정**
   - `/api/leave/admin/export/excel` 라우트 생성
   - requireAuth 및 requireAdmin 미들웨어 적용
   - 기본 응답 반환 (placeholder)

2. **테스트 작성 및 통과**
   - 인증 테스트: 401 응답 확인
   - 권한 테스트: User/Supervisor는 403, Admin은 200
   - Excel Content-Type 테스트 작성

3. **이슈 해결**
   - requireAdmin 미들웨어 대소문자 처리 ('Admin' vs 'admin')
   - JWT 토큰 생성 함수 파라미터 수정

### 현재 진행중
- Excel 파일 생성 기능 구현 (ExcelJS 사용)
- 테스트가 통과하도록 최소 코드 구현