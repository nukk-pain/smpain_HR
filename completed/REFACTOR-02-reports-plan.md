# Reports.js → Documents.js 리팩토링 계획

> **상태**: ✅ 완료 (2025.08.23)  
> **목표**: 급여명세서 관리 기능을 reports.js에서 documents.js로 이동  
> **이유**: reports.js는 "보고서 생성" 역할이지만 현재 80%가 "문서 관리" 기능

## 📊 현재 상태 분석

### 현재 기능 분포 및 예상 크기

#### reports.js (현재 725줄)
- **보고서 기능** (85-238줄, 153줄) → 유지
  - `GET /api/reports/payroll/:year_month` - 급여 통계 보고서
  
- **문서 관리 기능** (475줄) → 이동 대상
  - `POST /api/reports/payslip/match-employees` (240-346줄, 106줄)
  - `POST /api/reports/payslip/bulk-upload` (349-641줄, 292줄)
  - `GET /api/reports/payslip/download/:documentId` (644-721줄, 77줄)

#### documents.js (현재 398줄)
- `GET /api/documents/` - 문서 조회
- `GET /api/documents/:id/download` - 다운로드 (payslip 포함)
- `PUT /api/documents/:id/replace` - 문서 교체
- `DELETE /api/documents/:id` - 문서 삭제
- `GET /api/documents/admin/all` - 관리자 조회
- **누락**: 급여명세서 업로드 기능

### 리팩토링 후 예상 크기
- **documents.js**: 398 + 475 = **873줄** ✅ (1000줄 미만)
- **reports.js**: 725 - 475 = **250줄** ✅

### 주요 문제점
1. **역할 불일치**: reports.js가 문서 관리 담당
2. **기능 중복**: 다운로드가 양쪽에 존재
3. **API 일관성 부족**: `/reports/payslip/*` vs `/documents/*`
4. **불완전한 통합**: documents.js에 payslip 업로드 누락

## 🎯 리팩토링 목표

### 최종 구조
```
routes/
├── reports.js (200줄)         # 순수 보고서 생성
│   └── GET /payroll/:year_month
│
└── documents.js (700줄)        # 통합 문서 관리
    ├── GET /                   # 문서 목록
    ├── POST /payslip/upload    # 급여명세서 업로드 (이동)
    ├── POST /payslip/match     # 직원 매칭 (이동)
    ├── GET /:id/download       # 통합 다운로드
    └── PUT/DELETE /:id         # 문서 관리
```

## 📋 실행 계획

### Phase 1: 백업 및 준비 (15분)
```bash
# 백업 생성
cp backend/routes/reports.js backend/routes/reports.js.backup-$(date +%Y%m%d)
cp backend/routes/documents.js backend/routes/documents.js.backup-$(date +%Y%m%d)

# Git 브랜치 생성
git checkout -b refactor/payslip-to-documents
```

### Phase 2: 공통 유틸리티 추출 (30분)

#### 2.1 파일명 파서 확인
```javascript
// backend/utils/filenameParser.js - 이미 존재
const { parseEmployeeFromFilename, extractYearMonth } = require('../utils/filenameParser');
```

#### 2.2 Multer 설정 통합
```javascript
// backend/config/multerConfig.js - 새로 생성
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const createPayslipStorage = () => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/temp/');
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const safeFilename = `payslip_${timestamp}_${uniqueId}.pdf`;
      
      // 메타데이터 저장
      if (!req.fileMetadata) req.fileMetadata = [];
      req.fileMetadata.push({
        uniqueId: safeFilename,
        originalName: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype
      });
      
      cb(null, safeFilename);
    }
  });
};

module.exports = { createPayslipStorage };
```

### Phase 3: Documents.js에 기능 추가 (1시간)

#### 3.1 직원 매칭 엔드포인트 이동
```javascript
// documents.js에 추가
router.post('/payslip/match-employees',
  requireAuth,
  requireDocumentPermission('documents:manage'),
  asyncHandler(async (req, res) => {
    // reports.js에서 코드 이동
    // 권한 체크 수정: requirePermission('payroll:manage') → requireDocumentPermission('documents:manage')
  })
);
```

#### 3.2 대량 업로드 엔드포인트 이동
```javascript
// documents.js에 추가
const { createPayslipStorage } = require('../config/multerConfig');
const bulkPayslipUpload = multer({
  storage: createPayslipStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || 
                  path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(isPdf ? null : new Error('Only PDF files allowed'), isPdf);
  }
});

router.post('/payslip/bulk-upload',
  requireAuth,
  requireDocumentPermission('documents:manage'),
  bulkPayslipUpload.array('payslips', 50),
  asyncHandler(async (req, res) => {
    // reports.js에서 코드 이동
  })
);
```

#### 3.3 다운로드 통합
```javascript
// 기존 documents.js의 GET /:id/download 유지
// reports.js의 GET /payslip/download/:documentId 제거
// 한글 파일명 처리 로직 통합
```

### Phase 4: Reports.js 정리 (30분)

#### 4.1 이동할 코드 제거
- 240-346줄: match-employees 엔드포인트
- 348-641줄: bulk-upload 엔드포인트  
- 643-721줄: download 엔드포인트

#### 4.2 남길 코드
- 85-238줄: GET /payroll/:year_month 보고서

#### 4.3 의존성 정리
```javascript
// 불필요한 import 제거
// const multer = require('multer'); // 제거
// const crypto = require('crypto'); // 제거
// const { parseEmployeeFromFilename, extractYearMonth } = require('../utils/filenameParser'); // 제거
```

### Phase 5: Frontend 업데이트 (1시간)

#### 5.1 API 엔드포인트 변경
```typescript
// frontend/src/services/api/payroll.ts
// 변경 전
const PAYSLIP_API = '/api/reports/payslip';

// 변경 후
const PAYSLIP_API = '/api/documents/payslip';
```

#### 5.2 컴포넌트 업데이트
```typescript
// frontend/src/components/PayslipBulkUpload.tsx
// frontend/src/components/PayslipManagement.tsx
// API 경로 업데이트
```

### Phase 6: 테스트 전략 강화 (2시간)

#### 6.1 테스트 데이터 준비
```bash
# 테스트용 PDF 파일 생성
cat > backend/tests/fixtures/create-test-pdfs.sh << 'EOF'
#!/bin/bash
# 테스트용 PDF 파일 생성 (실제 급여명세서 형식)
echo "Creating test PDF files..."
for name in "김철수" "이영희" "박민수"; do
  for month in "01" "02" "03"; do
    filename="${name}_2025${month}.pdf"
    echo "Test payslip for ${name} - 2025/${month}" | \
      pandoc -o "backend/tests/fixtures/${filename}"
  done
done
EOF
chmod +x backend/tests/fixtures/create-test-pdfs.sh
```

#### 6.2 단위 테스트 작성
```javascript
// backend/tests/routes/documents.payslip.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');

describe('Payslip Management in Documents', () => {
  let authToken;
  let testUserId;
  
  beforeAll(async () => {
    // 테스트 환경 설정
    authToken = await getTestAuthToken('admin');
    testUserId = await createTestUser('김철수');
  });
  
  describe('POST /api/documents/payslip/match-employees', () => {
    it('should match employees by Korean name', async () => {
      const res = await request(app)
        .post('/api/documents/payslip/match-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileNames: [
            { fileName: '김철수_202501.pdf', employeeName: '김철수' },
            { fileName: '이영희_202501.pdf', employeeName: '이영희' }
          ]
        });
      
      expect(res.status).toBe(200);
      expect(res.body.matches).toHaveLength(2);
      expect(res.body.matches[0].matched).toBe(true);
    });
    
    it('should handle partial name matches', async () => {
      // 부분 매칭 테스트
    });
    
    it('should suggest candidates for ambiguous matches', async () => {
      // 모호한 매칭 테스트
    });
  });
  
  describe('POST /api/documents/payslip/bulk-upload', () => {
    it('should upload multiple PDFs with Korean filenames', async () => {
      const res = await request(app)
        .post('/api/documents/payslip/bulk-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('payslips', 'tests/fixtures/김철수_202501.pdf')
        .attach('payslips', 'tests/fixtures/이영희_202501.pdf')
        .field('mappings', JSON.stringify([
          { fileName: '김철수_202501.pdf', userId: testUserId, yearMonth: '202501' },
          { fileName: '이영희_202501.pdf', userId: testUserId2, yearMonth: '202501' }
        ]));
      
      expect(res.status).toBe(200);
      expect(res.body.uploadedCount).toBe(2);
      expect(res.body.errorCount).toBe(0);
    });
    
    it('should prevent duplicate uploads', async () => {
      // 중복 업로드 방지 테스트
    });
    
    it('should handle file size limits', async () => {
      // 파일 크기 제한 테스트
    });
    
    it('should validate PDF format', async () => {
      // PDF 형식 검증 테스트
    });
  });
  
  describe('GET /api/documents/:id/download', () => {
    it('should download payslip with original Korean filename', async () => {
      const res = await request(app)
        .get(`/api/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('UTF-8');
      expect(res.headers['content-disposition']).toContain('김철수');
    });
    
    it('should enforce access control', async () => {
      // 권한 체크 테스트
    });
  });
  
  afterAll(async () => {
    // 테스트 데이터 정리
    await cleanupTestData();
  });
});
```

#### 6.3 통합 테스트 스크립트
```bash
# backend/tests/integration/payslip-refactor.test.sh
#!/bin/bash

set -e  # 에러 발생 시 즉시 중단

echo "=== Payslip Refactoring Integration Test ==="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 카운터
TOTAL=0
PASSED=0
FAILED=0

# 테스트 함수
run_test() {
    local test_name=$1
    local command=$2
    local expected=$3
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing: $test_name ... "
    
    result=$(eval "$command" 2>&1)
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        FAILED=$((FAILED + 1))
    fi
}

# 1. 서버 상태 확인
run_test "Server health check" \
    "curl -s http://localhost:5000/health" \
    "ok"

# 2. 인증 토큰 획득
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}' | \
    jq -r '.token')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get auth token${NC}"
    exit 1
fi

# 3. 직원 매칭 테스트
run_test "Employee matching API" \
    "curl -s -X POST http://localhost:5000/api/documents/payslip/match-employees \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"fileNames\":[{\"fileName\":\"김철수_202501.pdf\",\"employeeName\":\"김철수\"}]}' | \
        jq -r '.success'" \
    "true"

# 4. 파일 업로드 테스트
echo "Testing file upload..."
if [ -f "tests/fixtures/test.pdf" ]; then
    run_test "Bulk upload API" \
        "curl -s -X POST http://localhost:5000/api/documents/payslip/bulk-upload \
            -H 'Authorization: Bearer $TOKEN' \
            -F 'payslips=@tests/fixtures/test.pdf' \
            -F 'mappings=[{\"fileName\":\"test.pdf\",\"userId\":\"...\"}]' | \
            jq -r '.success'" \
        "true"
fi

# 5. 다운로드 테스트
run_test "Document download API" \
    "curl -s -o /dev/null -w '%{http_code}' \
        -X GET http://localhost:5000/api/documents/test-doc-id/download \
        -H 'Authorization: Bearer $TOKEN'" \
    "200"

# 6. 이전 API 호환성 테스트 (리다이렉트)
run_test "Legacy API redirect" \
    "curl -s -o /dev/null -w '%{http_code}' \
        -X POST http://localhost:5000/api/reports/payslip/match-employees \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"test\":true}'" \
    "307"

# 결과 출력
echo ""
echo "=== Test Results ==="
echo -e "Total: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
```

#### 6.4 성능 테스트
```javascript
// backend/tests/performance/payslip-upload.perf.js
const autocannon = require('autocannon');

async function performanceTest() {
  const result = await autocannon({
    url: 'http://localhost:5000/api/documents/payslip/match-employees',
    connections: 10,
    duration: 30,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileNames: Array(50).fill({ 
        fileName: 'test.pdf', 
        employeeName: 'Test User' 
      })
    })
  });
  
  console.log('Performance Test Results:');
  console.log(`Avg Latency: ${result.latency.mean}ms`);
  console.log(`Requests/sec: ${result.requests.mean}`);
  console.log(`Errors: ${result.errors}`);
  
  // 성능 기준 검증
  assert(result.latency.p99 < 1000, 'p99 latency should be under 1 second');
  assert(result.errors === 0, 'No errors should occur');
}
```

#### 6.5 End-to-End 테스트
```typescript
// frontend/tests/e2e/payslip-upload.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Payslip Upload Flow', () => {
  test('should complete full upload flow', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    
    // 2. 급여명세서 관리 페이지로 이동
    await page.goto('/documents/payslip');
    
    // 3. 파일 선택
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'tests/fixtures/김철수_202501.pdf',
      'tests/fixtures/이영희_202501.pdf'
    ]);
    
    // 4. 직원 매칭 확인
    await expect(page.locator('.match-result')).toBeVisible();
    await expect(page.locator('.match-result')).toContainText('김철수');
    
    // 5. 업로드 실행
    await page.click('button:has-text("업로드")');
    
    // 6. 성공 메시지 확인
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('2개 파일 업로드 완료');
  });
  
  test('should handle errors gracefully', async ({ page }) => {
    // 에러 처리 테스트
  });
});
```

### Phase 7: 마이그레이션 및 배포 (30분)

#### 7.1 하위 호환성 처리 (임시)
```javascript
// reports.js에 리다이렉트 추가 (1개월 후 제거)
router.post('/payslip/match-employees', (req, res) => {
  console.warn('Deprecated: Use /api/documents/payslip/match-employees');
  res.redirect(307, '/api/documents/payslip/match-employees');
});

router.post('/payslip/bulk-upload', (req, res) => {
  console.warn('Deprecated: Use /api/documents/payslip/bulk-upload');
  res.redirect(307, '/api/documents/payslip/bulk-upload');
});
```

#### 7.2 문서 업데이트
- API 문서 갱신
- FUNCTIONS_VARIABLES.md 업데이트
- README.md 수정

### Phase 8: 정리 및 최적화 (30분)

#### 8.1 코드 정리
```bash
# ESLint 실행
npm run lint -- --fix backend/routes/documents.js
npm run lint -- --fix backend/routes/reports.js

# 불필요한 백업 파일 제거
rm backend/routes/reports.js.backup-*
```

#### 8.2 성능 최적화
- 파일 업로드 배치 처리 검증
- 메모리 사용량 모니터링

## 📋 추가 고려사항 (누락 부분 보완)

### 데이터베이스 관련
1. **UnifiedDocumentRepository 수정**
   - 기존 reports.js가 직접 db를 사용하는 부분 확인
   - documents.js의 repository 패턴으로 통일
   
2. **트랜잭션 처리**
   - 대량 업로드 시 트랜잭션 처리 필요
   - 실패 시 롤백 메커니즘 구현

### 보안 고려사항
1. **파일 업로드 보안**
   - 파일 타입 검증 강화
   - 파일명 sanitization
   - 바이러스 스캔 훅 추가 위치 확보
   
2. **접근 권한**
   - payroll:manage → documents:manage 권한 매핑
   - 기존 사용자 권한 마이그레이션 스크립트

### 에러 처리
1. **상세 에러 메시지**
   ```javascript
   // 에러 코드 정의
   const ERROR_CODES = {
     DUPLICATE_PAYSLIP: 'ERR_DUP_PAYSLIP',
     INVALID_PDF: 'ERR_INVALID_PDF',
     USER_NOT_FOUND: 'ERR_USER_404',
     FILE_TOO_LARGE: 'ERR_FILE_SIZE'
   };
   ```

2. **에러 로깅**
   - 업로드 실패 시 상세 로그
   - 매칭 실패 원인 추적

### Frontend 영향 분석
1. **컴포넌트 수정 필요**
   - `PayslipBulkUpload.tsx`
   - `PayslipManagement.tsx`
   - `FileManagement.tsx`
   - `AdminDocuments.tsx`
   
2. **상태 관리**
   - Redux/Context API 상태 업데이트
   - 캐시 무효화 처리

### 모니터링 및 로깅
```javascript
// 성능 모니터링 추가
const monitorUpload = async (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Payslip upload', {
      duration,
      fileCount: req.files?.length,
      userId: req.user.id,
      status: res.statusCode
    });
  });
  next();
};
```

## ⏱️ 수정된 예상 소요 시간

| Phase | 작업 내용 | 소요 시간 |
|-------|----------|----------|
| 1 | 백업 및 준비 | 15분 |
| 2 | 공통 유틸리티 추출 | 30분 |
| 3 | Documents.js 기능 추가 | 1시간 30분 |
| 4 | Reports.js 정리 | 30분 |
| 5 | Frontend 업데이트 | 1시간 30분 |
| 6 | 테스트 전략 강화 | **2시간** |
| 7 | 마이그레이션 | 30분 |
| 8 | 정리 및 최적화 | 30분 |
| **총계** | | **6시간 45분** |

## 🚨 주의사항

### API 변경사항
| 기존 | 변경 후 |
|-----|---------|
| POST /api/reports/payslip/match-employees | POST /api/documents/payslip/match-employees |
| POST /api/reports/payslip/bulk-upload | POST /api/documents/payslip/bulk-upload |
| GET /api/reports/payslip/download/:id | GET /api/documents/:id/download |

### 권한 체크 변경
- `requirePermission('payroll:manage')` → `requireDocumentPermission('documents:manage')`
- Admin 권한은 동일하게 유지

### 파일 경로
- 업로드 경로 동일: `uploads/payslips/`
- 임시 파일: `uploads/temp/`

## 📈 예상 효과

1. **명확한 책임 분리**
   - reports.js: 보고서 생성 전용 (200줄)
   - documents.js: 문서 관리 통합 (700줄)

2. **API 일관성**
   - 모든 문서 관련 API가 `/api/documents/*`로 통합

3. **유지보수성 향상**
   - 급여명세서가 문서의 한 타입으로 관리
   - 중복 코드 제거

4. **확장성**
   - 새로운 문서 타입 추가 용이
   - 보고서 기능 독립적 확장 가능

## 🚨 리스크 관리

### 잠재적 위험 요소
1. **파일 크기 증가**
   - documents.js가 873줄로 증가 (현재 398줄)
   - 해결: 필요 시 documents/payslip.js로 서브모듈 분리 고려

2. **API 호환성**
   - 기존 API 경로 변경으로 인한 호환성 문제
   - 해결: 307 리다이렉트로 단계적 마이그레이션

3. **권한 시스템 충돌**
   - payroll:manage vs documents:manage 권한 차이
   - 해결: 권한 매핑 테이블 작성 및 자동 변환

4. **파일 경로 문제**
   - uploads/payslips/ 경로 일관성
   - 해결: 경로 상수 중앙 관리

5. **메모리 누수 가능성**
   - 대량 파일 업로드 시 메모리 관리
   - 해결: 스트림 처리 및 가비지 컬렉션 최적화

### 단계별 검증 체크리스트
```bash
# 각 단계 후 실행할 검증 스크립트
#!/bin/bash

# 1. 구문 오류 체크
npm run lint

# 2. TypeScript 컴파일
cd frontend && npm run build-check

# 3. 단위 테스트
npm test

# 4. API 응답 검증
curl -X POST http://localhost:5000/api/documents/payslip/match-employees

# 5. 메모리 사용량 모니터링
node --expose-gc --trace-gc server.js
```

## 🔄 롤백 계획

### 즉시 롤백 (5분)
```bash
# 백업 파일로 복원
cp backend/routes/reports.js.backup-20250123 backend/routes/reports.js
cp backend/routes/documents.js.backup-20250123 backend/routes/documents.js

# Frontend 원복
git checkout -- frontend/src/services/api/payroll.ts
git checkout -- frontend/src/components/

# 서버 재시작
pm2 restart all
```

### 완전 롤백 (15분)
```bash
# Git으로 완전 복원
git checkout master
git branch -D refactor/payslip-to-documents

# 데이터베이스 복원 (필요시)
mongorestore --db SM_nomu backup/SM_nomu

# 캐시 클리어
redis-cli FLUSHALL

# 서비스 재시작
./restart-all.sh
```

## ✅ 체크리스트

- [ ] Phase 1: 백업 및 준비
- [ ] Phase 2: 공통 유틸리티 추출
- [ ] Phase 3: Documents.js에 기능 추가
  - [ ] match-employees 이동
  - [ ] bulk-upload 이동
  - [ ] 다운로드 통합
- [ ] Phase 4: Reports.js 정리
  - [ ] 불필요한 코드 제거
  - [ ] import 정리
- [ ] Phase 5: Frontend 업데이트
  - [ ] API 경로 변경
  - [ ] 컴포넌트 수정
- [ ] Phase 6: 테스트
  - [ ] Backend 테스트
  - [ ] Frontend 테스트
  - [ ] 통합 테스트
- [ ] Phase 7: 마이그레이션
  - [ ] 리다이렉트 설정
  - [ ] 문서 업데이트
- [ ] Phase 8: 최적화 및 정리

## 📝 완료 후 남은 구조

### reports.js (200줄)
```javascript
// 순수 보고서 생성 기능만 포함
- GET /api/reports/payroll/:year_month  // 급여 통계 보고서
// 향후 추가 가능:
// - GET /api/reports/leave/:year_month  // 휴가 현황 보고서
// - GET /api/reports/department/:id    // 부서별 보고서
```

### documents.js (700줄)
```javascript
// 통합 문서 관리 시스템
- GET    /api/documents/                      // 문서 목록
- GET    /api/documents/:id/download          // 문서 다운로드
- POST   /api/documents/payslip/match         // 급여명세서 직원 매칭
- POST   /api/documents/payslip/bulk-upload   // 급여명세서 대량 업로드
- PUT    /api/documents/:id/replace           // 문서 교체
- DELETE /api/documents/:id                   // 문서 삭제
- GET    /api/documents/admin/all             // 관리자 전체 조회
```

---

**작성일**: 2025년 1월 23일  
**작성자**: Claude Code  
**상태**: 📋 **계획 수립 완료**