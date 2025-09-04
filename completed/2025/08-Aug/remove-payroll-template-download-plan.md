# 급여 템플릿 다운로드 기능 제거 계획

## 목적
급여 파일 관리에서 템플릿 다운로드 기능을 제거

## 현재 상태 분석

### Frontend 구현 위치
1. **PayrollExcelUploadWithPreview.tsx**
   - Line 42: `DownloadIcon` import
   - Lines 420-433: `handleTemplateDownload` 함수
   - Lines 467-468: 템플릿 다운로드 버튼

2. **api.ts** 
   - Line 486: `downloadPayrollTemplate()` 서비스 함수

### Backend 구현 위치
1. **routes/reports.js**
   - Lines 282-290: `/template/payroll` 엔드포인트 (mock 데이터 반환)

2. **routes/upload.js**
   - Lines 880-902: `/upload/template` 엔드포인트 (실제 템플릿 생성)

3. **services/excel/ExcelService.js**
   - `generatePayrollTemplate()` 함수 구현

## 제거 계획

### Phase 1: Frontend 제거 ✅
1. [x] PayrollExcelUploadWithPreview.tsx 수정
   - [x] DownloadIcon import 제거
   - [x] handleTemplateDownload 함수 제거
   - [x] 템플릿 다운로드 버튼 UI 제거
   - [x] 관련 상태 및 이벤트 핸들러 정리

2. [x] api.ts 수정
   - [x] downloadPayrollTemplate() 함수 제거

3. [x] FileUpload.tsx 수정 (추가 발견)
   - [x] handleTemplateDownload 함수 제거
   - [x] 템플릿 다운로드 버튼 제거
   - [x] DownloadIcon import 제거

### Phase 2: Backend 제거 ✅
1. [x] routes/reports.js 수정
   - [x] `/template/payroll` 엔드포인트 제거

2. [x] routes/upload.js 수정
   - [x] `/upload/template` 엔드포인트 제거

3. [x] services/excel/ExcelService.js 수정
   - [x] generatePayrollTemplate() 함수 제거 (index.js, ExcelCacheService.js)

### Phase 3: 테스트 및 문서 업데이트 ✅
1. [x] 관련 테스트 파일 수정
   - [x] backend/tests/integration/payroll-excel-template.test.js 제거

2. [ ] 문서 업데이트 (선택사항)
   - [ ] docs/USER_GUIDE.md - 템플릿 다운로드 관련 내용 제거
   - [ ] docs/TROUBLESHOOTING_GUIDE.md - 템플릿 관련 문제 해결 내용 제거
   - [ ] docs/api/PAYROLL_API.md - API 엔드포인트 문서 업데이트

### Phase 4: 검증 ✅
1. [x] Frontend 빌드 확인
   - [x] TypeScript 컴파일 에러 없음 (템플릿 관련)
   - [x] 사용하지 않는 import 정리

2. [x] Backend 테스트
   - [x] 급여 업로드 기능 정상 작동 확인 (preview, confirm 엔드포인트 존재)
   - [x] API 엔드포인트 제거 확인
   - [x] Syntax 검증 완료

3. [x] E2E 테스트
   - [x] 급여 관리 페이지 정상 렌더링
   - [x] 파일 업로드 기능 정상 작동

## 장단점 분석

### 장점
- **코드 간소화**: 불필요한 기능 제거로 유지보수 부담 감소
- **UX 개선**: 사용자가 템플릿 없이도 직접 Excel 파일 작성 가능
- **의존성 감소**: 템플릿 생성 로직 제거로 Excel 서비스 단순화

### 단점
- **사용자 불편**: 정확한 Excel 형식을 모르는 사용자는 어려움 겪을 수 있음
- **오류 증가 가능성**: 템플릿 없이 작성 시 형식 오류 발생 가능
- **학습 곡선**: 새로운 사용자가 올바른 형식 익히는데 시간 필요

## 추천 결정
**템플릿 다운로드 기능 제거를 진행**하되, 다음 보완책 권장:
1. 급여 업로드 페이지에 필수 컬럼 정보를 명확히 표시
2. 샘플 데이터를 화면에 표시하여 형식 가이드 제공
3. 업로드 시 더 자세한 오류 메시지 제공

## 실행 순서
1. Frontend 코드 제거 (UI 먼저)
2. Backend 엔드포인트 제거
3. 테스트 및 문서 업데이트
4. 전체 기능 검증