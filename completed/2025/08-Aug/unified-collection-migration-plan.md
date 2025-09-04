# 📋 통합 문서 컬렉션 마이그레이션 계획

## ✅ 마이그레이션 체크리스트

### 🎯 전체 진행률: 0/47 (0%)

---

### 📅 Phase 0: 사전 준비 (필수)
- [ ] 프로젝트 승인 받기
- [ ] 마이그레이션 일정 확정
- [ ] 팀원 역할 분담
- [ ] 위험 요소 최종 검토
- [ ] 롤백 계획 검토 및 승인

### 📅 Phase 1: 준비 단계 (Day 1 AM)

#### 1.1 백업 생성
- [ ] Production DB 전체 백업 실행
- [ ] 백업 파일 검증 (복원 가능 여부 테스트)
- [ ] 백업 파일 안전한 위치에 저장
- [ ] 백업 스크립트 작성 (`/backend/scripts/backupDocumentCollections.js`)

#### 1.2 통합 레포지토리 생성
- [ ] `/backend/repositories/UnifiedDocumentRepository.js` 파일 생성
- [ ] 기존 3개 레포지토리 메서드 통합 구현
- [ ] Repository 단위 테스트 작성
- [ ] Repository 테스트 실행 및 통과 확인

#### 1.3 마이그레이션 스크립트 작성
- [ ] `/backend/scripts/migrateToUnifiedCollection.js` 파일 생성
- [ ] 데이터 변환 함수 구현 (payslips → unified)
- [ ] 데이터 변환 함수 구현 (payroll_documents → unified)
- [ ] 데이터 변환 함수 구현 (documents → unified)
- [ ] 중복 제거 로직 구현
- [ ] 파일 검증 로직 구현
- [ ] 진행 상황 로깅 구현
- [ ] DRY RUN 모드 테스트

### 📅 Phase 2: Backend 수정 (Day 1 PM)

#### 2.1 Routes 수정
- [ ] `/backend/routes/documents.js` - 통합 컬렉션 사용하도록 수정
- [ ] `/backend/routes/reports.js` - UnifiedDocumentRepository 사용하도록 수정
- [ ] `/backend/routes/payslip-verify.js` - 검증 로직 수정
- [ ] `/backend/routes/payroll.js` - 급여 연동 수정

#### 2.2 Repository 전환
- [ ] PayrollDocumentRepository → UnifiedDocumentRepository 전환
- [ ] 메서드 시그니처 호환성 확인
- [ ] Backward compatibility 테스트

#### 2.3 인덱스 생성
- [ ] `/backend/scripts/createUnifiedIndexes.js` 스크립트 작성
- [ ] 복합 인덱스 생성 실행
- [ ] 텍스트 검색 인덱스 생성
- [ ] Partial 인덱스 생성
- [ ] 인덱스 성능 테스트

### 📅 Phase 3: 데이터 마이그레이션 (Day 2 AM)

#### 3.1 마이그레이션 실행 준비
- [ ] 마이그레이션 환경 변수 설정
- [ ] 체크포인트 저장 디렉토리 생성
- [ ] 로그 파일 디렉토리 준비

#### 3.2 마이그레이션 실행
- [ ] DRY RUN 모드로 최종 테스트
- [ ] 실제 마이그레이션 시작
- [ ] 진행 상황 모니터링
- [ ] 오류 로그 확인
- [ ] 마이그레이션 완료 확인

#### 3.3 데이터 검증
- [ ] 총 레코드 수 일치 확인
- [ ] 중복 제거 결과 확인
- [ ] 필수 필드 존재 확인
- [ ] 파일 경로 유효성 확인
- [ ] 사용자 정보 매핑 확인

### 📅 Phase 4: Frontend 수정 (Day 2 PM)

#### 4.1 API Service 수정
- [ ] `/frontend/src/services/api.ts` - 필드명 매핑 확인
- [ ] 응답 타입 검증

#### 4.2 Component 수정
- [ ] `MyDocuments.tsx` - 필드명 호환성 확인
- [ ] `AdminDocuments.tsx` - 새 스키마 필드 활용
- [ ] `PayslipManagement.tsx` - 업로드 로직 확인

### 📅 Phase 5: 테스트 (Day 3 AM)

#### 5.1 자동화 테스트
- [ ] Unit 테스트 전체 실행
- [ ] Integration 테스트 실행
- [ ] E2E 테스트 실행
- [ ] 성능 벤치마크 테스트

#### 5.2 수동 테스트
- [ ] 사용자 문서함 접근 테스트
- [ ] 문서 다운로드 테스트
- [ ] Admin 문서 관리 테스트
- [ ] Bulk upload 테스트
- [ ] 문서 삭제/복원 테스트

### 📅 Phase 6: 배포 (Day 3 PM)

#### 6.1 Production 배포
- [ ] Production 환경 최종 백업
- [ ] 서비스 점검 공지
- [ ] 마이그레이션 실행
- [ ] 서비스 재시작
- [ ] 모니터링 시작

#### 6.2 배포 후 검증
- [ ] API 응답 시간 확인
- [ ] 에러율 모니터링
- [ ] 사용자 피드백 수집
- [ ] 24시간 안정성 모니터링

### 📅 Phase 7: 마무리

- [ ] 이전 컬렉션 아카이브
- [ ] 문서화 업데이트
- [ ] 팀 회고 미팅
- [ ] 최종 보고서 작성

---

## 🚨 긴급 롤백 체크리스트 (필요시)

- [ ] 서비스 즉시 중단
- [ ] 통합 컬렉션 백업
- [ ] 원본 컬렉션 복원
- [ ] 이전 코드 버전 배포
- [ ] 서비스 재시작
- [ ] 롤백 원인 분석

---

## 📌 프로젝트 정보
- **작성일**: 2025-01-20
- **목표**: 3개 컬렉션(`payslips`, `payroll_documents`, `documents`)을 단일 `unified_documents` 컬렉션으로 통합
- **예상 소요 시간**: 2-3일
- **위험도**: 높음 (데이터 마이그레이션 포함)
- **담당자**: 
  - 기술 리드: ___________
  - Backend 개발: ___________
  - Frontend 개발: ___________
  - QA: ___________
  - DevOps: ___________

## 🎯 현재 상황 분석

### 현재 컬렉션 구조
1. **`payslips`** (레거시)
   - 구조: 기본 급여명세서 정보
   - 용도: 초기 급여명세서 저장
   - 데이터량: 확인 필요

2. **`payroll_documents`** (신규)
   - 구조: 상세 메타데이터 포함
   - 용도: bulk upload 급여명세서
   - 데이터량: 확인 필요

3. **`documents`** (일반)
   - 구조: 범용 문서
   - 용도: 증명서, 계약서 등
   - 데이터량: 확인 필요

### 영향받는 파일 목록

#### Backend Routes (핵심 수정 필요)
- `/backend/routes/documents.js` - 주요 문서 API (line 51, 79, 110, 145, 226, 299, 340, 349, 379)
- `/backend/routes/reports.js` - 급여명세서 업로드 (line 850, 1052, 1218, 1084) - PayrollDocumentRepository 사용
- `/backend/routes/payslip-verify.js` - 급여명세서 검증 (line 20, 100, 123)
- `/backend/routes/payroll.js` - 급여 관련 API (확인 필요)

#### Backend Repositories
- `/backend/repositories/PayrollDocumentRepository.js` - payroll_documents 전용 레포지토리
- `/backend/repositories/BaseRepository.js` - 기본 레포지토리 (collectionName 참조)
- `/backend/repositories/UnifiedDocumentRepository.js` - **새로 생성 필요**
- `/backend/utils/database.js` - DB 연결 유틸리티

#### Backend Scripts & Database
- `/backend/scripts/createPayrollIndexes.js` - 인덱스 생성 (payroll_documents 인덱스 정의)
- `/backend/scripts/createUnifiedIndexes.js` - **새로 생성 필요**
- `/backend/scripts/resetDatabase.js` - DB 초기화
- `/backend/scripts/migrateToUnifiedCollection.js` - **새로 생성 필요**
- `/backend/scripts/backupDocumentCollections.js` - **새로 생성 필요**
- `/backend/add-sample-payslips.js` - 샘플 데이터
- `/backend/check-payslips.js` - payslips 컬렉션 체크
- `/backend/check-duplicate.js` - 중복 문서 체크
- `/backend/check-db.js` - DB 연결 체크
- `/backend/count-payslips.js` - payslips 카운트

#### Backend Tests
- `/backend/tests/documents.test.js`
- `/backend/tests/documents-performance.test.js`
- `/backend/tests/integration/payroll-payslip-download.test.js`
- `/backend/tests/integration/payroll-payslip-delete.test.js`
- `/backend/tests/repositories/PayrollDocumentRepository.test.js`
- `/backend/tests/repositories/UnifiedDocumentRepository.test.js` - **새로 생성 필요**

#### Frontend Components
- `/frontend/src/pages/MyDocuments.tsx`
- `/frontend/src/pages/AdminDocuments.tsx`
- `/frontend/src/pages/FileManagement.tsx` - 파일 관리 페이지
- `/frontend/src/pages/Payroll/PayslipManagement.tsx` - Payroll 모듈 내 급여명세서 관리
- `/frontend/src/components/PayslipManagement.tsx`
- `/frontend/src/components/PayslipBulkUpload.tsx`

#### Frontend Services
- `/frontend/src/services/api.ts` - API 서비스
- `/frontend/src/services/payrollService.ts` - Payroll 전용 서비스
- `/frontend/src/services/payrollService.test.ts` - 테스트
- `/frontend/src/services/endpoints.ts` - API 엔드포인트 정의
- `/frontend/src/utils/security.ts` - 보안 유틸리티
- `/frontend/src/config/documentTypes.ts` - 문서 타입 정의

#### File Storage Paths
- `/backend/uploads/payslips/` - 급여명세서 파일
- `/backend/uploads/payslips/backup/` - 백업 파일
- `/backend/uploads/documents/` - 일반 문서 파일
- `/backend/uploads/temp/` - 임시 업로드
- `/backend/uploads/unified/` - **통합 후 새 경로 (선택사항)**

## 🏗️ 통합 스키마 설계

### 스키마 설계 원칙
1. **필수 필드 최소화**: 모든 문서 타입이 공유하는 필드만 필수
2. **유연한 메타데이터**: 문서 타입별 특수 필드는 metadata에 저장
3. **인덱스 최적화**: 자주 쿼리되는 필드 조합으로 복합 인덱스 생성
4. **버전 관리**: 스키마 버전 필드로 향후 마이그레이션 대비

```javascript
// unified_documents 컬렉션 스키마 v2.0
{
  _id: ObjectId,
  
  // === 📌 핵심 필드 (Required) ===
  userId: ObjectId,                    // 문서 소유자 (UNIQUE INDEX with year+month for payslip)
  documentType: String,                // 'payslip' | 'certificate' | 'contract' | 'policy' | 'report' | 'other'
  documentCategory: String,            // 세부 분류 (급여명세서, 재직증명서, 경력증명서, 연차확인서 등)
  
  // === 📁 파일 정보 ===
  file: {
    uniqueId: String,                 // UUID v4 고유 식별자 (물리적 파일명)
    systemName: String,               // 시스템 생성 파일명 (payslip_2025_01_uuid.pdf)
    originalName: String,             // 사용자가 업로드한 원본 파일명
    displayName: String,              // UI 표시용 이름 (사용자 친화적)
    path: String,                     // 파일 저장 경로 (/uploads/unified/2025/01/)
    size: Number,                     // 파일 크기 (bytes)
    mimeType: String,                 // MIME type (application/pdf)
    hash: String,                     // SHA-256 해시 (중복 감지용)
    encoding: String,                 // 파일 인코딩 (UTF-8, EUC-KR 등)
    isEncrypted: Boolean,             // 암호화 여부
    encryptionMethod: String          // 암호화 방식
  },
  
  // === 📅 시간 정보 ===
  temporal: {
    year: Number,                     // 연도 (2025) - INDEX
    month: Number,                    // 월 (1-12) - INDEX
    yearMonth: String,                // 'YYYY-MM' 형식 (2025-01)
    documentDate: Date,               // 문서 기준 날짜
    period: {                         // 문서가 커버하는 기간
      start: Date,                    // 시작일
      end: Date                       // 종료일
    },
    validUntil: Date                  // 유효기간
  },
  
  // === 👤 사용자 정보 (Denormalized for performance) ===
  userInfo: {
    name: String,                     // 사용자 이름
    employeeId: String,               // 사번 - INDEX
    department: String,               // 부서명
    position: String,                 // 직급
    email: String,                    // 이메일
    companyName: String,              // 회사명
    employmentType: String            // 고용형태 (정규직, 계약직 등)
  },
  
  // === 🔄 상태 관리 ===
  status: {
    current: String,                  // 'active' | 'deleted' | 'archived' | 'processing' | 'error'
    isDeleted: Boolean,               // 소프트 삭제 여부 (INDEX)
    deletedAt: Date,                  // 삭제 시각
    deletedBy: ObjectId,              // 삭제자
    deleteReason: String,             // 삭제 사유
    archivedAt: Date,                 // 보관 처리 시각
    expiresAt: Date                   // 자동 삭제 예정일 (GDPR/개인정보보호)
  },
  
  // === 📝 감사 정보 ===
  audit: {
    createdAt: Date,                  // 생성 시각 (INDEX)
    createdBy: ObjectId,              // 생성자
    createdByName: String,            // 생성자 이름
    uploadedAt: Date,                 // 업로드 시각
    uploadedBy: ObjectId,             // 업로드한 사람
    uploadedByName: String,           // 업로드한 사람 이름
    lastModifiedAt: Date,             // 최종 수정 시각
    lastModifiedBy: ObjectId,        // 최종 수정자
    version: Number,                  // 문서 버전 (1부터 시작)
    checksum: String                  // 무결성 체크섬
  },
  
  // === 🔧 메타데이터 (Flexible by documentType) ===
  metadata: {
    // === Payslip specific ===
    payroll: {
      payrollId: ObjectId,            // 연결된 급여 레코드
      paymentDate: Date,              // 지급일
      baseSalary: Number,             // 기본급
      totalAmount: Number,            // 총 지급액
      netAmount: Number,              // 실수령액
      bankAccount: String,            // 계좌번호 (마스킹)
      paymentMethod: String           // 지급방법
    },
    
    // === Certificate specific ===
    certificate: {
      certificateType: String,        // 재직증명서, 경력증명서, 퇴직증명서 등
      certificateNumber: String,      // 증명서 번호
      purpose: String,                // 용도 (은행제출용, 비자신청용 등)
      issueDate: Date,                // 발급일
      expiryDate: Date,               // 만료일
      issuedBy: String,               // 발급 담당자
      verificationCode: String        // 진위확인 코드
    },
    
    // === Contract specific ===
    contract: {
      contractType: String,           // 근로계약서, 연봉계약서, 비밀유지계약서 등
      contractNumber: String,         // 계약서 번호
      startDate: Date,                // 계약 시작일
      endDate: Date,                  // 계약 종료일
      parties: [String],              // 계약 당사자들
      signedDate: Date,               // 서명일
      isAmendment: Boolean,           // 수정계약 여부
      parentContractId: ObjectId      // 원계약 ID
    },
    
    // === General fields ===
    tags: [String],                   // 검색 태그 (INDEX: text)
    notes: String,                    // 관리자 메모
    customFields: Object,             // 확장 가능한 커스텀 필드
    
    // === Parsed from filename (legacy support) ===
    parsed: {
      employeeName: String,           // 파일명에서 추출한 이름
      company: String,                // 파일명에서 추출한 회사
      yearMonth: String,              // 파일명에서 추출한 연월
      documentType: String            // 파일명에서 추출한 문서 유형
    }
  },
  
  // === 📜 이력 관리 ===
  history: [{
    version: Number,                  // 버전 번호
    action: String,                   // 'created' | 'modified' | 'replaced' | 'deleted' | 'restored' | 'archived'
    performedBy: ObjectId,            // 수행자 ID
    performedByName: String,          // 수행자 이름
    performedAt: Date,                // 수행 시각
    changes: {                        // 변경 내용
      before: Object,                 // 이전 값
      after: Object                   // 이후 값
    },
    reason: String,                   // 변경 사유
    ipAddress: String,                // IP 주소
    userAgent: String                 // 사용자 에이전트
  }],
  
  // === 🔍 접근 로그 (별도 컬렉션 고려) ===
  recentAccess: [{                    // 최근 10건만 저장
    userId: ObjectId,                 // 접근자
    userName: String,                 // 접근자 이름
    action: String,                   // 'view' | 'download' | 'print' | 'share'
    timestamp: Date,                  // 시각
    ipAddress: String,                // IP 주소
    deviceInfo: String                // 디바이스 정보
  }],
  accessCount: {                      // 집계 정보
    views: Number,                    // 조회 수
    downloads: Number,                // 다운로드 수
    prints: Number,                   // 인쇄 수
    shares: Number,                   // 공유 수
    lastAccessedAt: Date              // 마지막 접근 시각
  },
  
  // === 🔐 권한 관리 ===
  permissions: {
    owner: ObjectId,                  // 소유자 (보통 userId와 동일)
    visibility: String,               // 'private' | 'department' | 'company' | 'public'
    canView: [ObjectId],              // 볼 수 있는 사용자 ID 목록
    canDownload: [ObjectId],          // 다운로드 가능한 사용자 ID 목록
    canEdit: [ObjectId],              // 수정 가능한 사용자 ID 목록
    canDelete: [ObjectId],            // 삭제 가능한 사용자 ID 목록
    roles: {                          // 역할 기반 권한
      viewer: [String],               // 볼 수 있는 역할 (User, Supervisor, Admin)
      editor: [String],               // 편집 가능한 역할
      admin: [String]                 // 관리 가능한 역할
    },
    shareLinks: [{                    // 공유 링크
      token: String,                  // 공유 토큰
      createdAt: Date,                // 생성일
      expiresAt: Date,                // 만료일
      accessCount: Number,            // 접근 횟수
      maxAccess: Number               // 최대 접근 횟수
    }]
  },
  
  // === 🔄 마이그레이션 정보 ===
  migration: {
    source: String,                   // 'payslips' | 'payroll_documents' | 'documents' | 'new'
    originalId: ObjectId,             // 원본 컬렉션 document ID
    migratedAt: Date,                // 마이그레이션 시각
    migratedBy: String,              // 마이그레이션 수행자/스크립트
    dataVersion: Number               // 데이터 버전
  },
  
  // === 🔎 검색 최적화 ===
  search: {
    fullText: String,                // 전문 검색용 텍스트 (TEXT INDEX)
    keywords: [String],              // 키워드 목록
    sortKey: String                  // 정렬 키 (YYYYMM_employeeId_type)
  },
  
  // === 📊 분석 정보 ===
  analytics: {
    importance: Number,              // 중요도 점수 (1-10)
    retentionPeriod: Number,         // 보존 기간 (개월)
    lastReviewedAt: Date,            // 마지막 검토일
    nextReviewDate: Date,            // 다음 검토 예정일
    complianceFlags: [String]        // 규정 준수 플래그 (GDPR, PIPA 등)
  },
  
  // === ⚙️ 시스템 정보 ===
  system: {
    schemaVersion: Number,           // 스키마 버전 (현재: 2)
    dataQuality: {                  // 데이터 품질
      completeness: Number,          // 완성도 (0-100)
      validated: Boolean,            // 검증 여부
      validationErrors: [String]     // 검증 오류
    },
    processingStatus: String,       // 처리 상태
    errorLog: [String],             // 오류 로그
    flags: [String]                 // 시스템 플래그
  }
}
```

## 📝 구현 계획

### Phase 1: 준비 단계 (Day 1 AM)

#### 1.1 백업 생성
```bash
# 모든 컬렉션 백업
mongodump --db=SM_nomu --collection=payslips --out=/backup/$(date +%Y%m%d)
mongodump --db=SM_nomu --collection=payroll_documents --out=/backup/$(date +%Y%m%d)
mongodump --db=SM_nomu --collection=documents --out=/backup/$(date +%Y%m%d)
```

#### 1.2 통합 레포지토리 생성
- [ ] `/backend/repositories/UnifiedDocumentRepository.js` 생성
- [ ] 기존 3개 레포지토리 메서드 통합
- [ ] 테스트 코드 작성

#### 1.3 마이그레이션 스크립트 작성
- [ ] `/backend/scripts/migrateToUnifiedCollection.js` 생성
- [ ] 데이터 변환 로직 구현
  - payslips → unified 변환 함수
  - payroll_documents → unified 변환 함수
  - documents → unified 변환 함수
- [ ] 중복 제거 로직 구현
  - userId + year + month + documentType 조합 체크
  - 최신 문서 우선 정책
- [ ] 검증 로직 구현
  - 필수 필드 존재 확인
  - 파일 경로 유효성 검증
  - userId 존재 확인
- [ ] 진행 상황 로깅

### Phase 2: Backend 수정 (Day 1 PM)

#### 2.1 Routes 수정
- [ ] `/backend/routes/documents.js` - 통합 컬렉션 사용
  ```javascript
  // Before
  const payslipsCollection = db.collection('payslips');
  const payrollDocsCollection = db.collection('payroll_documents');
  const documentsCollection = db.collection('documents');
  
  // After
  const unifiedCollection = db.collection('unified_documents');
  ```

- [ ] `/backend/routes/reports.js` - bulk upload 수정
- [ ] `/backend/routes/payslip-verify.js` - 검증 로직 수정
- [ ] `/backend/routes/payroll.js` - 급여 연동 수정

#### 2.2 Repository 통합
- [ ] `PayrollDocumentRepository.js` → `UnifiedDocumentRepository.js` 전환
- [ ] 메서드 시그니처 유지 (backward compatibility)

#### 2.3 인덱스 생성
```javascript
// /backend/scripts/createUnifiedIndexes.js
db.unified_documents.createIndex({ userId: 1, year: -1, month: -1 });
db.unified_documents.createIndex({ documentType: 1, status: 1 });
db.unified_documents.createIndex({ deleted: 1 });
db.unified_documents.createIndex({ "_searchText": "text" });
db.unified_documents.createIndex({ uploadedAt: -1 });
db.unified_documents.createIndex({ 
  userId: 1, 
  documentType: 1, 
  year: -1, 
  month: -1 
}, { unique: true, partialFilterExpression: { documentType: "payslip" } });
```

### Phase 3: 데이터 마이그레이션 (Day 2 AM)

#### 3.1 마이그레이션 실행 (상세 구현)
```javascript
// /backend/scripts/migrateToUnifiedCollection.js
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// 마이그레이션 설정
const CONFIG = {
  BATCH_SIZE: 1000,
  CHECKPOINT_INTERVAL: 100,
  DRY_RUN: process.env.DRY_RUN === 'true',
  VERBOSE: process.env.VERBOSE === 'true',
  PARALLEL_WORKERS: 4,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// 마이그레이션 상태 추적
class MigrationTracker {
  constructor() {
    this.stats = {
      payslips: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      payroll_documents: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      documents: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      overall: { startTime: Date.now(), checkpoints: [] }
    };
    this.errors = [];
    this.duplicateMap = new Map();
  }

  async saveCheckpoint(collection, lastId) {
    const checkpoint = {
      collection,
      lastId,
      timestamp: new Date(),
      stats: { ...this.stats }
    };
    this.stats.overall.checkpoints.push(checkpoint);
    
    // 체크포인트를 파일로 저장 (중단 시 재개 가능)
    await fs.writeFile(
      `migration_checkpoint_${Date.now()}.json`,
      JSON.stringify(checkpoint, null, 2)
    );
  }

  logError(collection, docId, error) {
    this.errors.push({
      collection,
      documentId: docId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
    this.stats[collection].errors++;
  }
}

// 데이터 변환 함수들
const transformPayslipToUnified = async (doc, userMap) => {
  const user = userMap.get(doc.userId?.toString()) || {};
  const fileHash = doc.fileName ? 
    crypto.createHash('sha256').update(doc.fileName).digest('hex') : null;
  
  return {
    _id: doc._id, // 기존 ID 유지 (선택사항)
    userId: doc.userId,
    documentType: 'payslip',
    documentCategory: '급여명세서',
    
    file: {
      uniqueId: doc.uniqueFileName || uuidv4(),
      systemName: doc.fileName || `payslip_${doc.year}_${doc.month}.pdf`,
      originalName: doc.originalFilename || doc.fileName,
      displayName: `${doc.year}년 ${doc.month}월 급여명세서`,
      path: doc.filePath || `/uploads/payslips/${doc.fileName}`,
      size: doc.fileSize || 0,
      mimeType: 'application/pdf',
      hash: fileHash,
      encoding: doc.encoding || 'UTF-8',
      isEncrypted: false
    },
    
    temporal: {
      year: doc.year,
      month: doc.month,
      yearMonth: doc.yearMonth || `${doc.year}-${String(doc.month).padStart(2, '0')}`,
      documentDate: doc.paymentDate || new Date(doc.year, doc.month - 1, 25),
      period: {
        start: new Date(doc.year, doc.month - 1, 1),
        end: new Date(doc.year, doc.month, 0)
      }
    },
    
    userInfo: {
      name: user.name || doc.userName || 'Unknown',
      employeeId: user.employeeId || doc.employeeId,
      department: user.department || doc.department,
      position: user.position,
      email: user.email,
      companyName: doc.companyName || 'SM Entertainment',
      employmentType: user.employmentType || '정규직'
    },
    
    status: {
      current: doc.deleted ? 'deleted' : 'active',
      isDeleted: doc.deleted || false,
      deletedAt: doc.deletedAt,
      deletedBy: doc.deletedBy,
      deleteReason: doc.deleteReason
    },
    
    audit: {
      createdAt: doc.createdAt || doc.uploadedAt || new Date(),
      createdBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt || doc.createdAt,
      uploadedBy: doc.uploadedBy,
      lastModifiedAt: doc.updatedAt || doc.uploadedAt,
      version: 1
    },
    
    metadata: {
      payroll: {
        payrollId: doc.payrollId,
        paymentDate: doc.paymentDate
      },
      parsed: {
        employeeName: doc.parsedEmployeeName,
        company: doc.parsedCompany,
        yearMonth: doc.parsedYearMonth
      }
    },
    
    history: doc.modificationHistory || [],
    
    permissions: {
      owner: doc.userId,
      visibility: 'private',
      roles: {
        viewer: ['Admin', 'Supervisor'],
        editor: ['Admin'],
        admin: ['Admin']
      }
    },
    
    migration: {
      source: 'payslips',
      originalId: doc._id,
      migratedAt: new Date(),
      migratedBy: 'migration_script_v2',
      dataVersion: 1
    },
    
    search: {
      fullText: `${user.name} ${user.employeeId} ${doc.year} ${doc.month} 급여명세서`,
      sortKey: `${doc.year}${String(doc.month).padStart(2, '0')}_${user.employeeId}_payslip`
    },
    
    system: {
      schemaVersion: 2,
      dataQuality: {
        completeness: calculateCompleteness(doc),
        validated: false
      }
    }
  };
};

const transformPayrollDocToUnified = async (doc, userMap) => {
  const user = userMap.get(doc.userId?.toString()) || {};
  
  return {
    userId: doc.userId,
    documentType: doc.documentType || 'payslip',
    documentCategory: doc.category || '급여명세서',
    
    file: {
      uniqueId: doc.uniqueId || uuidv4(),
      systemName: doc.fileName,
      originalName: doc.originalFileName,
      displayName: doc.displayName || `${doc.year}년 ${doc.month}월 급여명세서`,
      path: doc.filePath,
      size: doc.fileSize,
      mimeType: doc.mimeType || 'application/pdf',
      hash: doc.fileHash,
      encoding: doc.encoding || 'UTF-8',
      isEncrypted: doc.isSecure || false
    },
    
    temporal: {
      year: doc.year,
      month: doc.month,
      yearMonth: doc.yearMonth,
      documentDate: doc.documentDate || doc.uploadedAt
    },
    
    userInfo: {
      name: user.name || doc.userName,
      employeeId: user.employeeId || doc.employeeId,
      department: user.department || doc.department
    },
    
    status: {
      current: doc.status || 'active',
      isDeleted: doc.status === 'deleted',
      deletedAt: doc.deletedAt,
      deletedBy: doc.deletedBy
    },
    
    audit: {
      createdAt: doc.createdAt,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      lastModifiedAt: doc.updatedAt,
      version: 1
    },
    
    metadata: doc.metadata || {},
    
    accessCount: {
      views: doc.accessCount || 0,
      lastAccessedAt: doc.lastAccessedAt
    },
    
    migration: {
      source: 'payroll_documents',
      originalId: doc._id,
      migratedAt: new Date(),
      migratedBy: 'migration_script_v2',
      dataVersion: 1
    },
    
    system: {
      schemaVersion: 2
    }
  };
};

// 중복 감지 함수
async function findDuplicate(db, doc) {
  // 급여명세서의 경우 userId + year + month 조합으로 중복 체크
  if (doc.documentType === 'payslip') {
    return await db.collection('unified_documents').findOne({
      userId: doc.userId,
      'temporal.year': doc.temporal.year,
      'temporal.month': doc.temporal.month,
      documentType: 'payslip'
    });
  }
  
  // 파일 해시로 중복 체크
  if (doc.file?.hash) {
    return await db.collection('unified_documents').findOne({
      'file.hash': doc.file.hash
    });
  }
  
  return null;
}

// 파일 존재 확인 및 이동
async function validateAndMoveFile(doc, CONFIG) {
  const oldPath = doc.file.path;
  
  // 파일 존재 확인
  try {
    await fs.access(oldPath);
    doc.file.fileExists = true;
  } catch (err) {
    console.warn(`⚠️ File not found: ${oldPath}`);
    doc.file.fileExists = false;
    doc.system.dataQuality.validationErrors = doc.system.dataQuality.validationErrors || [];
    doc.system.dataQuality.validationErrors.push('FILE_NOT_FOUND');
    return doc;
  }
  
  // 새 경로 생성 (선택사항: 파일 재구성)
  if (CONFIG.REORGANIZE_FILES) {
    const year = doc.temporal.year;
    const month = String(doc.temporal.month).padStart(2, '0');
    const newDir = path.join('/uploads/unified', String(year), month);
    
    await fs.mkdir(newDir, { recursive: true });
    
    const newFileName = `${doc.documentType}_${doc.userInfo.employeeId}_${year}${month}_${doc.file.uniqueId}.pdf`;
    const newPath = path.join(newDir, newFileName);
    
    // 파일 복사 (이동 대신 복사로 안전하게)
    await fs.copyFile(oldPath, newPath);
    doc.file.path = newPath;
    doc.file.oldPath = oldPath;
  }
  
  return doc;
}

// 데이터 완성도 계산
function calculateCompleteness(doc) {
  const requiredFields = ['userId', 'year', 'month', 'fileName'];
  const optionalFields = ['employeeId', 'department', 'payrollId', 'fileSize'];
  
  let score = 0;
  let total = requiredFields.length + optionalFields.length;
  
  requiredFields.forEach(field => {
    if (doc[field]) score += 2; // 필수 필드는 가중치 2
  });
  
  optionalFields.forEach(field => {
    if (doc[field]) score += 1; // 선택 필드는 가중치 1
  });
  
  return Math.round((score / (requiredFields.length * 2 + optionalFields.length)) * 100);
}

// 메인 마이그레이션 함수
async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu');
  const tracker = new MigrationTracker();
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🚀 Starting Unified Collection Migration');
    console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    
    // 사용자 정보 미리 로드 (JOIN 최적화)
    const users = await db.collection('users').find({}).toArray();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    
    // 트랜잭션 시작 (MongoDB 4.0+)
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 1. Payslips 마이그레이션
        await migrateCollection(db, session, 'payslips', transformPayslipToUnified, tracker, userMap);
        
        // 2. Payroll Documents 마이그레이션
        await migrateCollection(db, session, 'payroll_documents', transformPayrollDocToUnified, tracker, userMap);
        
        // 3. Documents 마이그레이션
        await migrateCollection(db, session, 'documents', transformDocumentToUnified, tracker, userMap);
      });
      
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
    
    // 최종 통계 출력
    printFinalStats(tracker);
    
    // 오류 로그 저장
    if (tracker.errors.length > 0) {
      await fs.writeFile(
        `migration_errors_${Date.now()}.json`,
        JSON.stringify(tracker.errors, null, 2)
      );
    }
    
  } finally {
    await client.close();
  }
}

// 컬렉션별 마이그레이션
async function migrateCollection(db, session, collectionName, transformer, tracker, userMap) {
  console.log(`\n📦 Migrating ${collectionName}...`);
  
  const collection = db.collection(collectionName);
  const targetCollection = db.collection('unified_documents');
  
  // 총 문서 수 계산
  const totalCount = await collection.countDocuments({});
  tracker.stats[collectionName].total = totalCount;
  
  console.log(`Found ${totalCount} documents in ${collectionName}`);
  
  // 배치 처리
  let processed = 0;
  let lastId = null;
  
  while (processed < totalCount) {
    // 배치 쿼리
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const batch = await collection
      .find(query, { session })
      .sort({ _id: 1 })
      .limit(CONFIG.BATCH_SIZE)
      .toArray();
    
    if (batch.length === 0) break;
    
    // 배치 변환 및 삽입
    const bulkOps = [];
    
    for (const doc of batch) {
      try {
        // 변환
        const unified = await transformer(doc, userMap);
        
        // 파일 검증
        if (unified.file?.path) {
          await validateAndMoveFile(unified, CONFIG);
          if (!unified.file.fileExists) {
            tracker.stats[collectionName].missing_files++;
          }
        }
        
        // 중복 체크
        const duplicate = await findDuplicate(db, unified);
        if (duplicate) {
          tracker.stats[collectionName].duplicates++;
          tracker.duplicateMap.set(
            `${unified.userId}_${unified.temporal?.year}_${unified.temporal?.month}`,
            { original: duplicate._id, new: doc._id }
          );
          continue;
        }
        
        // Bulk 작업 추가
        if (!CONFIG.DRY_RUN) {
          bulkOps.push({
            insertOne: { document: unified }
          });
        }
        
        tracker.stats[collectionName].migrated++;
        
      } catch (error) {
        tracker.logError(collectionName, doc._id, error);
      }
      
      processed++;
      lastId = doc._id;
      
      // 진행 상황 출력
      if (processed % 100 === 0) {
        const progress = Math.round((processed / totalCount) * 100);
        console.log(`  Progress: ${progress}% (${processed}/${totalCount})`);
      }
      
      // 체크포인트 저장
      if (processed % CONFIG.CHECKPOINT_INTERVAL === 0) {
        await tracker.saveCheckpoint(collectionName, lastId);
      }
    }
    
    // Bulk 실행
    if (bulkOps.length > 0 && !CONFIG.DRY_RUN) {
      try {
        await targetCollection.bulkWrite(bulkOps, { session });
      } catch (error) {
        console.error('Bulk write error:', error);
        throw error;
      }
    }
  }
  
  console.log(`✅ Completed ${collectionName}: ${tracker.stats[collectionName].migrated} migrated`);
}

// 통계 출력
function printFinalStats(tracker) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  const collections = ['payslips', 'payroll_documents', 'documents'];
  let totalOriginal = 0;
  let totalMigrated = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalMissingFiles = 0;
  
  collections.forEach(col => {
    const stats = tracker.stats[col];
    console.log(`\n${col.toUpperCase()}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated} ✅`);
    console.log(`  Duplicates: ${stats.duplicates} ⚠️`);
    console.log(`  Errors: ${stats.errors} ❌`);
    console.log(`  Missing Files: ${stats.missing_files} 📁`);
    
    totalOriginal += stats.total;
    totalMigrated += stats.migrated;
    totalDuplicates += stats.duplicates;
    totalErrors += stats.errors;
    totalMissingFiles += stats.missing_files;
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log('TOTAL:');
  console.log(`  Original Documents: ${totalOriginal}`);
  console.log(`  Successfully Migrated: ${totalMigrated}`);
  console.log(`  Duplicates Skipped: ${totalDuplicates}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Missing Files: ${totalMissingFiles}`);
  
  const duration = Date.now() - tracker.stats.overall.startTime;
  console.log(`\n⏱️ Total Time: ${Math.round(duration / 1000)}s`);
  console.log('='.repeat(60));
}

// 실행
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate, transformPayslipToUnified, transformPayrollDocToUnified };
```

#### 3.2 데이터 검증
- [ ] 총 레코드 수 확인
  ```javascript
  const originalCount = payslipsCount + payrollDocsCount + documentsCount;
  const unifiedCount = await db.collection('unified_documents').countDocuments();
  const duplicatesRemoved = originalCount - unifiedCount;
  ```
- [ ] 중복 제거 확인
  ```javascript
  const duplicates = await db.collection('unified_documents').aggregate([
    { $group: { _id: { userId: "$userId", year: "$year", month: "$month", type: "$documentType" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  ```
- [ ] 필수 필드 존재 확인
  ```javascript
  const invalidDocs = await db.collection('unified_documents').find({
    $or: [
      { userId: { $exists: false } },
      { documentType: { $exists: false } },
      { uploadedAt: { $exists: false } }
    ]
  }).toArray();
  ```
- [ ] 파일 경로 유효성 확인
  ```javascript
  const docsWithFiles = await db.collection('unified_documents').find({ filePath: { $exists: true } }).toArray();
  for (const doc of docsWithFiles) {
    try {
      await fs.access(doc.filePath);
    } catch (err) {
      console.error(`Missing file for document ${doc._id}: ${doc.filePath}`);
    }
  }
  ```

### Phase 4: Frontend 수정 (Day 2 PM)

#### 4.1 API Service 수정
- [ ] `/frontend/src/services/api.ts` - 엔드포인트 확인
- [ ] 응답 타입 검증

#### 4.2 Component 수정 (필요시)
- [ ] `MyDocuments.tsx` - 필드명 확인
- [ ] `AdminDocuments.tsx` - 필드명 확인
- [ ] `PayslipManagement.tsx` - 업로드 로직 확인

### Phase 5: 테스트 (Day 3 AM)

#### 5.1 Unit Tests 수정
```javascript
// /backend/tests/repositories/UnifiedDocumentRepository.test.js
describe('UnifiedDocumentRepository', () => {
  describe('Document CRUD Operations', () => {
    it('should create a payslip document with all required fields', async () => {
      const doc = await repository.createDocument({
        userId: testUserId,
        documentType: 'payslip',
        temporal: { year: 2025, month: 1 },
        file: { path: '/test/file.pdf' }
      });
      
      expect(doc).toHaveProperty('_id');
      expect(doc.documentType).toBe('payslip');
      expect(doc.temporal.year).toBe(2025);
      expect(doc.status.current).toBe('active');
      expect(doc.system.schemaVersion).toBe(2);
    });
    
    it('should prevent duplicate payslips for same user/year/month', async () => {
      await repository.createDocument(testPayslip);
      await expect(repository.createDocument(testPayslip))
        .rejects.toThrow('Duplicate document');
    });
    
    it('should handle soft delete with audit trail', async () => {
      const doc = await repository.createDocument(testDoc);
      const deleted = await repository.softDelete(doc._id, adminUserId);
      
      expect(deleted.status.current).toBe('deleted');
      expect(deleted.status.isDeleted).toBe(true);
      expect(deleted.status.deletedBy).toEqual(adminUserId);
      expect(deleted.history).toHaveLength(2); // created + deleted
    });
  });
  
  describe('Query Performance', () => {
    beforeEach(async () => {
      // Insert 10000 test documents
      await insertBulkTestDocuments(10000);
    });
    
    it('should retrieve user documents within 100ms', async () => {
      const start = Date.now();
      const docs = await repository.findUserDocuments(userId, { limit: 100 });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
      expect(docs).toHaveLength(100);
    });
    
    it('should handle complex aggregations efficiently', async () => {
      const start = Date.now();
      const stats = await repository.getDocumentStatistics();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byYear');
    });
  });
});
```

#### 5.2 Integration Tests
```javascript
// /backend/tests/integration/unified-documents.test.js
describe('Unified Documents Integration', () => {
  describe('Migration Validation', () => {
    it('should migrate all payslips without data loss', async () => {
      const originalPayslips = await db.collection('payslips').find({}).toArray();
      await migrate();
      
      const migrated = await db.collection('unified_documents')
        .find({ 'migration.source': 'payslips' }).toArray();
      
      expect(migrated.length).toBe(originalPayslips.length);
      
      // Validate each field mapping
      originalPayslips.forEach(original => {
        const unified = migrated.find(m => 
          m.migration.originalId.equals(original._id)
        );
        
        expect(unified.userId).toEqual(original.userId);
        expect(unified.temporal.year).toBe(original.year);
        expect(unified.temporal.month).toBe(original.month);
        expect(unified.file.originalName).toBe(original.originalFilename);
      });
    });
    
    it('should handle file validation correctly', async () => {
      // Create document with missing file
      const docWithMissingFile = {
        ...testDoc,
        file: { path: '/nonexistent/file.pdf' }
      };
      
      await migrate();
      
      const migrated = await db.collection('unified_documents')
        .findOne({ 'file.path': '/nonexistent/file.pdf' });
      
      expect(migrated.file.fileExists).toBe(false);
      expect(migrated.system.dataQuality.validationErrors)
        .toContain('FILE_NOT_FOUND');
    });
    
    it('should deduplicate documents correctly', async () => {
      // Insert duplicates in different collections
      const duplicateDoc = {
        userId: testUserId,
        year: 2025,
        month: 1,
        fileName: 'payslip.pdf'
      };
      
      await db.collection('payslips').insertOne({ ...duplicateDoc });
      await db.collection('payroll_documents').insertOne({ 
        ...duplicateDoc,
        documentType: 'payslip'
      });
      
      await migrate();
      
      const unified = await db.collection('unified_documents')
        .find({
          userId: testUserId,
          'temporal.year': 2025,
          'temporal.month': 1
        }).toArray();
      
      expect(unified).toHaveLength(1); // Only one should exist
    });
  });
  
  describe('API Compatibility', () => {
    it('should maintain backward compatibility for GET /api/documents', async () => {
      await migrate();
      
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Check legacy field names are present
      const doc = response.body.data[0];
      expect(doc).toHaveProperty('fileName'); // Legacy field
      expect(doc).toHaveProperty('type');
      expect(doc).toHaveProperty('year');
      expect(doc).toHaveProperty('month');
    });
    
    it('should support admin document management with new schema', async () => {
      await migrate();
      
      const response = await request(app)
        .get('/api/admin/documents')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      
      const doc = response.body.data[0];
      expect(doc).toHaveProperty('userInfo');
      expect(doc).toHaveProperty('status');
      expect(doc).toHaveProperty('audit');
      expect(doc).toHaveProperty('permissions');
    });
  });
  
  describe('Performance Benchmarks', () => {
    beforeEach(async () => {
      // Setup: Insert 50000 documents
      await insertBulkTestDocuments(50000);
      await createIndexes();
    });
    
    it('should handle concurrent reads efficiently', async () => {
      const concurrentRequests = 100;
      const promises = [];
      
      const start = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/documents')
            .set('Authorization', `Bearer ${tokens[i % 10]}`)
        );
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
    
    it('should perform bulk uploads within acceptable time', async () => {
      const files = generateTestFiles(100); // 100 files
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/documents/bulk-upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', files);
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // 30 seconds for 100 files
      expect(response.body.uploaded).toBe(100);
    });
  });
});
```

#### 5.3 E2E Tests
```javascript
// /backend/tests/e2e/document-workflow.test.js
describe('Document Management E2E Workflow', () => {
  describe('User Document Portal', () => {
    it('should complete full user workflow', async () => {
      // 1. User logs in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'password' });
      
      const token = loginRes.body.token;
      
      // 2. User views their documents
      const docsRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);
      
      expect(docsRes.body.data).toHaveLength(12); // 12 months of payslips
      
      // 3. User downloads a document
      const docId = docsRes.body.data[0]._id;
      const downloadRes = await request(app)
        .get(`/api/documents/${docId}/download`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
      
      // 4. Verify access log was created
      const doc = await db.collection('unified_documents')
        .findOne({ _id: new ObjectId(docId) });
      
      expect(doc.accessCount.downloads).toBe(1);
      expect(doc.recentAccess).toHaveLength(1);
      expect(doc.recentAccess[0].action).toBe('download');
    });
  });
  
  describe('Admin Bulk Upload Workflow', () => {
    it('should handle complete bulk upload process', async () => {
      // 1. Admin uploads Excel with payslip data
      const excelFile = createTestExcel([
        { employeeId: 'EMP001', year: 2025, month: 1, amount: 5000000 },
        { employeeId: 'EMP002', year: 2025, month: 1, amount: 4500000 },
        { employeeId: 'EMP003', year: 2025, month: 1, amount: 4000000 }
      ]);
      
      const uploadRes = await request(app)
        .post('/api/payroll/bulk-upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', excelFile);
      
      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.processed).toBe(3);
      
      // 2. Verify documents were created
      const docs = await db.collection('unified_documents')
        .find({
          documentType: 'payslip',
          'temporal.year': 2025,
          'temporal.month': 1
        }).toArray();
      
      expect(docs).toHaveLength(3);
      
      // 3. Admin reviews and approves
      const reviewRes = await request(app)
        .post('/api/payroll/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentIds: docs.map(d => d._id) });
      
      expect(reviewRes.status).toBe(200);
      
      // 4. Users can now see their payslips
      const userToken = await getUserToken('EMP001');
      const userDocsRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userToken}`);
      
      const userPayslip = userDocsRes.body.data.find(d => 
        d.temporal.year === 2025 && d.temporal.month === 1
      );
      
      expect(userPayslip).toBeDefined();
      expect(userPayslip.status.current).toBe('active');
    });
  });
  
  describe('Document Lifecycle Management', () => {
    it('should handle document replacement workflow', async () => {
      // 1. Create initial document
      const doc = await createTestDocument();
      
      // 2. Admin replaces document
      const newFile = Buffer.from('Updated PDF content');
      const replaceRes = await request(app)
        .put(`/api/documents/${doc._id}/replace`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('document', newFile, 'updated.pdf')
        .field('reason', 'Correction needed');
      
      expect(replaceRes.status).toBe(200);
      
      // 3. Verify history
      const updated = await db.collection('unified_documents')
        .findOne({ _id: doc._id });
      
      expect(updated.history).toHaveLength(2);
      expect(updated.history[1].action).toBe('replaced');
      expect(updated.history[1].reason).toBe('Correction needed');
      expect(updated.audit.version).toBe(2);
      
      // 4. Verify old file was backed up
      const backupPath = updated.history[1].changes.before.filePath;
      await expect(fs.access(backupPath)).resolves.not.toThrow();
    });
    
    it('should handle soft delete and restore', async () => {
      const doc = await createTestDocument();
      
      // 1. Admin deletes document
      const deleteRes = await request(app)
        .delete(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate document' });
      
      expect(deleteRes.status).toBe(200);
      
      // 2. User cannot see deleted document
      const userDocsRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userToken}`);
      
      const deletedDoc = userDocsRes.body.data.find(d => 
        d._id === doc._id.toString()
      );
      expect(deletedDoc).toBeUndefined();
      
      // 3. Admin can see deleted document
      const adminDocsRes = await request(app)
        .get('/api/admin/documents?includeDeleted=true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const adminDeletedDoc = adminDocsRes.body.data.find(d => 
        d._id === doc._id.toString()
      );
      expect(adminDeletedDoc).toBeDefined();
      expect(adminDeletedDoc.status.current).toBe('deleted');
      
      // 4. Admin restores document
      const restoreRes = await request(app)
        .put(`/api/documents/${doc._id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(restoreRes.status).toBe(200);
      
      // 5. User can see restored document
      const afterRestoreRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userToken}`);
      
      const restoredDoc = afterRestoreRes.body.data.find(d => 
        d._id === doc._id.toString()
      );
      expect(restoredDoc).toBeDefined();
      expect(restoredDoc.status.current).toBe('active');
    });
  });
});
```

### Phase 6: 배포 (Day 3 PM)

#### 6.1 Production 준비
- [ ] Production DB 백업
- [ ] 마이그레이션 스크립트 최종 검증
- [ ] Rollback 스크립트 준비

#### 6.2 배포 실행
1. 서비스 일시 중단 (maintenance mode)
2. DB 백업
3. 마이그레이션 실행
4. 애플리케이션 배포
5. 서비스 재시작
6. 모니터링

## 🔄 Rollback 계획

### Rollback 트리거 조건
- 데이터 손실 감지
- 성능 저하 50% 이상
- 중요 기능 오류

### Rollback 절차
```bash
# 1. 서비스 중단
pm2 stop all

# 2. 통합 컬렉션 삭제
mongo SM_nomu --eval "db.unified_documents.drop()"

# 3. 원본 컬렉션 복원
mongorestore --db=SM_nomu --collection=payslips /backup/20250120/SM_nomu/payslips.bson
mongorestore --db=SM_nomu --collection=payroll_documents /backup/20250120/SM_nomu/payroll_documents.bson
mongorestore --db=SM_nomu --collection=documents /backup/20250120/SM_nomu/documents.bson

# 4. 이전 버전 코드 배포
git checkout <previous-version>
npm install
npm run build

# 5. 서비스 재시작
pm2 restart all
```

## ⚠️ 위험 요소 및 대응 방안

### 1. 데이터 중복
- **위험**: 3개 컬렉션에 동일 문서 존재
- **대응**: 
  - userId + year + month + documentType 조합으로 중복 체크
  - 중복 발견 시 최신 문서(uploadedAt 기준) 유지
  - 중복 문서 ID 로깅

### 2. 파일 경로 불일치
- **위험**: 파일 시스템 경로 변경
- **대응**: 
  - 경로 매핑 테이블 유지
  ```javascript
  const pathMapping = {
    '/uploads/payslips/': '/uploads/unified/',
    '/uploads/documents/': '/uploads/unified/',
    '/uploads/payroll/': '/uploads/unified/'
  };
  ```
  - 심볼릭 링크로 기존 경로 유지
  - 점진적 파일 이동

### 3. 성능 저하
- **위험**: 단일 컬렉션 크기 증가 (예상 10만+ 문서)
- **대응**: 
  - **인덱스 최적화**:
    ```javascript
    // 복합 인덱스 전략
    // 1. 주요 쿼리 패턴별 인덱스
    { userId: 1, 'temporal.year': -1, 'temporal.month': -1, documentType: 1 } // 사용자별 문서
    { 'userInfo.employeeId': 1, 'temporal.yearMonth': -1 } // 사번 기반 검색
    { documentType: 1, 'status.current': 1, 'audit.createdAt': -1 } // 타입별 최신 문서
    
    // 2. 전문 검색 인덱스
    { 'search.fullText': 'text' } // 텍스트 검색
    
    // 3. 관리자 쿼리용 인덱스
    { 'status.isDeleted': 1, 'audit.createdAt': -1 } // 삭제된 문서 관리
    { 'file.hash': 1 } // 중복 파일 검색
    
    // 4. Partial 인덱스 (특정 조건만)
    { userId: 1, 'temporal.year': 1, 'temporal.month': 1 },
    { unique: true, partialFilterExpression: { documentType: 'payslip' } }
    ```
  
  - **샤딩 전략** (대용량 시):
    ```javascript
    // Shard Key 선택
    sh.shardCollection('SM_nomu.unified_documents', {
      userId: 'hashed'  // 사용자별 균등 분산
    });
    
    // 또는 복합 샤드 키
    sh.shardCollection('SM_nomu.unified_documents', {
      'temporal.year': 1,
      userId: 'hashed'
    });
    ```
  
  - **캐싱 전략**:
    ```javascript
    // Redis 캐싱 레이어
    const cacheKey = `docs:${userId}:${year}:${month}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // DB 조회 후 캐싱
    const docs = await collection.find(query).toArray();
    await redis.setex(cacheKey, 3600, JSON.stringify(docs)); // 1시간 캐시
    ```
  
  - **쿼리 최적화**:
    ```javascript
    // Projection으로 필요한 필드만 조회
    const projection = {
      _id: 1,
      documentType: 1,
      'file.displayName': 1,
      'temporal.yearMonth': 1,
      'status.current': 1
    };
    
    // Aggregation Pipeline 최적화
    const pipeline = [
      { $match: { userId, 'status.current': 'active' } },
      { $sort: { 'temporal.yearMonth': -1 } },
      { $limit: 100 },
      { $project: projection }
    ];
    ```

### 4. API 호환성
- **위험**: Frontend 오류
- **대응**: 
  - API 응답 구조 유지 (필드명 동일)
  - 버전별 API 제공 (/api/v1/, /api/v2/)
  - 필드 매핑 레이어
  ```javascript
  function mapToLegacyFormat(unifiedDoc) {
    if (unifiedDoc.documentType === 'payslip') {
      return {
        ...unifiedDoc,
        // Legacy payslips format
        yearMonth: unifiedDoc.yearMonth,
        fileName: unifiedDoc.fileName || unifiedDoc.uniqueId
      };
    }
    return unifiedDoc;
  }
  ```

### 5. 트랜잭션 처리
- **위험**: 마이그레이션 중 일부 실패
- **대응**: 
  - MongoDB 트랜잭션 사용
  - 배치 단위 처리 (1000개씩)
  - 체크포인트 저장

### 6. 메모리 부족
- **위험**: 대량 데이터 처리 시 OOM
- **대응**: 
  - 스트림 처리
  - 커서 기반 읽기
  - 배치 처리

## 📊 검증 체크리스트

### 데이터 무결성
- [ ] 전체 문서 수 = payslips + payroll_documents + documents (중복 제외)
- [ ] 모든 userId가 users 컬렉션에 존재
- [ ] 모든 파일 경로가 유효
- [ ] 필수 필드 누락 없음

### 기능 검증
- [ ] 개인 문서함 조회 정상
- [ ] Admin 문서 관리 정상
- [ ] 문서 다운로드 정상
- [ ] 문서 업로드 정상
- [ ] Bulk upload 정상
- [ ] 문서 삭제/복원 정상

### 성능 검증
- [ ] 문서 목록 조회 < 1초
- [ ] 문서 다운로드 시작 < 1초
- [ ] Bulk upload 100개 < 30초

## 📝 완료 기준
1. 모든 테스트 통과 (Unit, Integration, E2E)
2. 성능 기준 충족
   - 문서 목록 조회 < 1초 (1000개 기준)
   - 문서 검색 < 2초
   - 동시 사용자 100명 처리
3. 데이터 무결성 확인
   - 0% 데이터 손실
   - 100% 파일 접근 가능
   - 중복 제거 완료
4. 24시간 모니터링 이상 없음
   - 에러율 < 0.1%
   - 응답 시간 SLA 충족
5. 롤백 테스트 성공

## 🎯 기대 효과
- **개발 효율성**: 30% 향상 (단일 API)
- **유지보수성**: 50% 개선 (중복 코드 제거)
- **확장성**: 새로운 문서 타입 추가 용이
- **일관성**: 데이터 중복 제거
- **성능**: 인덱스 최적화로 20% 개선
- **저장 공간**: 중복 제거로 15% 절감

## 📌 추가 고려사항

### 보안
- 파일 접근 권한 검증 강화
- 감사 로그 필수 기록
- 민감 정보 암호화

### 운영
- 백업 자동화 (일일)
- 모니터링 대시보드 구성
- 알림 설정 (Slack/Email)

### 향후 계획
- GraphQL API 도입 검토
- ElasticSearch 연동 (전문 검색)
- S3 파일 스토리지 전환

---

**작성자**: Claude AI Assistant  
**검토자**: [검토자 이름]  
**승인자**: [승인자 이름]