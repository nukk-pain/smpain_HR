# 급여명세서 PDF 일괄 업로드 기능 구현 계획

## 🎉 구현 완료 (2025-08-18)

**모든 Phase가 성공적으로 완료되었습니다!**

### ✅ 구현된 주요 기능
1. **일괄 업로드**: 최대 50개 PDF 파일 동시 처리
2. **자동 직원 매칭**: 파일명 기반 지능형 매칭
3. **수동 매칭**: 자동 매칭 실패 시 수동 선택
4. **중복 방지**: 파일 및 월별 중복 체크
5. **업로드 이력**: 최근 업로드 기록 조회
6. **성능 최적화**: 병렬 처리 및 메모이제이션
7. **UX 개선**: 툴팁, 배지, 단축키 지원

## 📋 개요

### 목적
노무사가 보내주는 여러 개의 PDF 급여명세서 파일을 한 번에 업로드하고 자동으로 직원별로 매칭하여 저장하는 기능 구현

### 현재 상황
- **기존 구현**: 개별 PDF 업로드만 가능 (PayslipManagement 컴포넌트)
- **문제점**: 직원이 많을 경우 일일이 업로드해야 함
- **해결책**: FileManagement 페이지에 일괄 업로드 탭 추가

### 예상 파일명 형식
```
연세신명마취통증의학과의원_상용202507_경가영.pdf
{회사명}_{고용형태}{년월}_{직원명}.pdf
```

## 🎯 기능 요구사항

### 1. UI/UX 요구사항
- FileManagement 페이지에 탭 추가 (Excel / PDF)
- 드래그&드롭 지원
- 다중 파일 선택 지원
- 업로드 진행 상태 표시
- 매칭 결과 미리보기
- 수동 매칭 인터페이스

### 2. 기능적 요구사항
- 파일명 자동 파싱
- 직원명 → userId 자동 매칭
- 매칭 실패 시 수동 선택 옵션
- 중복 파일 체크
- 일괄 저장
- 업로드 이력 관리

### 3. 비기능적 요구사항
- 파일 크기 제한: 개별 5MB, 총 50MB
- 동시 업로드 파일 수: 최대 50개
- 처리 시간: 50개 파일 기준 30초 이내

## 🏗️ 아키텍처 설계

### 컴포넌트 구조
```
FileManagement.tsx
├── Tabs
│   ├── Tab: "급여 데이터 (Excel)"
│   │   └── PayrollExcelUploadWithPreview (기존)
│   └── Tab: "급여명세서 (PDF)"
│       └── PayslipBulkUpload (신규)
│           ├── FileDropzone
│           ├── FileList
│           ├── MatchingPreview
│           └── UploadProgress
```

### 데이터 플로우
```
1. 파일 선택/드롭
   ↓
2. 파일명 파싱
   ↓
3. 직원 매칭 (API 호출)
   ↓
4. 매칭 결과 표시
   ↓
5. 수동 수정 (필요시)
   ↓
6. 일괄 업로드
   ↓
7. 결과 확인
```

## 💻 구현 상세

### 1. Frontend 구현

#### 1.1 새 컴포넌트: PayslipBulkUpload.tsx
```typescript
interface PayslipFile {
  file: File;
  fileName: string;
  parsedData: {
    company?: string;
    employmentType?: string;
    yearMonth?: string;
    employeeName?: string;
  };
  matchStatus: 'pending' | 'matched' | 'failed' | 'manual';
  matchedUserId?: string;
  matchedUser?: {
    id: string;
    name: string;
    employeeId: string;
    department: string;
  };
  error?: string;
}

interface PayslipBulkUploadProps {
  onUploadComplete?: () => void;
}
```

#### 1.2 파일명 파싱 유틸리티
```typescript
// utils/payslipParser.ts
export function parsePayslipFileName(fileName: string): ParsedPayslip {
  // 다양한 파일명 패턴 지원
  const patterns = [
    /^(.+?)_(.+?)(\d{6})_(.+?)\.pdf$/,  // 회사명_고용형태YYYYMM_이름.pdf
    /^(.+?)_(\d{4})-(\d{2})_(.+?)\.pdf$/, // 회사명_YYYY-MM_이름.pdf
    /^(.+?)_(.+?)_(\d{8})\.pdf$/,         // 회사명_이름_YYYYMMDD.pdf
  ];
  
  // 파싱 로직
}
```

#### 1.3 FileManagement.tsx 수정
```typescript
import { Tabs, Tab } from '@mui/material';
import { TableChart, PictureAsPdf } from '@mui/icons-material';

const [tabValue, setTabValue] = useState(0);

return (
  <Container>
    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
      <Tab label="급여 데이터 (Excel)" icon={<TableChart />} />
      <Tab label="급여명세서 (PDF)" icon={<PictureAsPdf />} />
    </Tabs>
    
    {tabValue === 0 && <PayrollExcelUploadWithPreview />}
    {tabValue === 1 && <PayslipBulkUpload />}
  </Container>
);
```

### 2. Backend 구현

#### 2.1 새 API 엔드포인트
```javascript
// routes/reports.js

// 파일명으로 직원 매칭
router.post('/payslip/match-employees', 
  requireAuth,
  requirePermission('payroll:manage'),
  async (req, res) => {
    const { fileNames } = req.body;
    // 파일명 파싱 및 직원 매칭 로직
  }
);

// 일괄 업로드
router.post('/payslip/bulk-upload',
  requireAuth,
  requirePermission('payroll:manage'),
  multer({ limits: { files: 50 } }).array('payslips', 50),
  async (req, res) => {
    const { mappings } = req.body; // userId와 파일 매핑 정보
    // 일괄 처리 로직
  }
);
```

#### 2.2 직원 매칭 서비스
```javascript
// services/EmployeeMatchingService.js
class EmployeeMatchingService {
  async matchByName(name) {
    // 이름으로 직원 검색
    // 유사도 알고리즘 적용
    // 최적 매칭 반환
  }
  
  async bulkMatch(names) {
    // 배치 매칭 처리
  }
}
```

### 3. 매칭 알고리즘

#### 3.1 직원명 매칭 전략
1. **정확한 일치**: 100% 매칭
2. **부분 일치**: 성 또는 이름만 일치
3. **유사도 매칭**: Levenshtein distance 활용
4. **수동 매칭**: 자동 매칭 실패 시

#### 3.2 중복 처리
- 같은 직원, 같은 년월 → 덮어쓰기 확인
- 파일명 중복 → 경고 표시

## 📊 UI 디자인

### 메인 화면
```
┌─────────────────────────────────────────────┐
│ 📁 File Management                          │
├─────────────────────────────────────────────┤
│ [급여 데이터] [급여명세서*]                 │
├─────────────────────────────────────────────┤
│                                             │
│   ┌───────────────────────────────────┐    │
│   │                                   │    │
│   │   📄 PDF 파일을 드래그하세요      │    │
│   │                                   │    │
│   │   [파일 선택]                     │    │
│   └───────────────────────────────────┘    │
│                                             │
│ 업로드된 파일 (3/3 매칭됨)                  │
│ ┌─────────────────────────────────────┐    │
│ │ ✅ 경가영 (2025-07) → 매칭 완료     │    │
│ │ ✅ 권형수 (2025-07) → 매칭 완료     │    │
│ │ ⚠️ 김채영 (2025-07) → 수동 선택 필요│    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [취소] [일괄 업로드]                        │
└─────────────────────────────────────────────┘
```

### 매칭 확인 다이얼로그
```
┌─────────────────────────────────────────────┐
│ 직원 매칭 확인                              │
├─────────────────────────────────────────────┤
│ 파일: 김채영_202507.pdf                     │
│                                             │
│ 검색된 직원:                                │
│ ○ 김채영 (마케팅팀)                        │
│ ○ 김채은 (영업팀)                          │
│ ○ 건너뛰기                                 │
│                                             │
│ [취소] [확인]                               │
└─────────────────────────────────────────────┘
```

## 🔄 구현 단계

### Phase 1: 기본 구조 (2시간) ✅ 완료
- [x] FileManagement 페이지에 탭 추가
- [x] PayslipBulkUpload 컴포넌트 생성
- [x] 파일 드롭존 구현

### Phase 2: 파싱 및 매칭 (3시간) ✅ 완료
- [x] 파일명 파싱 유틸리티 구현
- [x] 직원 매칭 API 구현
- [x] 매칭 결과 UI 구현

### Phase 3: 업로드 처리 (2시간) ✅ 완료
- [x] 일괄 업로드 API 구현
- [x] 진행 상태 표시
- [x] 에러 처리

### Phase 4: 개선 사항 (2시간) ✅ 완료
- [x] 수동 매칭 UI
- [x] 중복 파일 처리
- [x] 업로드 이력 관리

### Phase 5: 테스트 및 최적화 (1시간) ✅ 완료
- [x] 대용량 파일 테스트
- [x] 성능 최적화 (병렬 처리, 메모이제이션)
- [x] 사용성 개선 (툴팁, 배지, 단축키)

## 🚀 예상 효과

### 정량적 효과
- **시간 절감**: 50명 기준 50분 → 5분 (90% 감소)
- **오류 감소**: 수동 업로드 대비 80% 감소
- **처리량 증가**: 일일 처리 가능 직원 수 10배 증가

### 정성적 효과
- 노무사 업무 효율성 향상
- 사용자 만족도 증가
- 시스템 활용도 증가

## ⚠️ 리스크 및 대응 방안

### 리스크 1: 파일명 규칙 불일치
- **대응**: 유연한 파싱 규칙, 수동 매칭 옵션

### 리스크 2: 대용량 파일 처리
- **대응**: 청크 단위 업로드, 프로그레시브 처리

### 리스크 3: 동명이인 처리
- **대응**: 부서/직급 추가 확인, 수동 선택

## 📝 테스트 계획

### 단위 테스트
- 파일명 파싱 테스트
- 직원 매칭 알고리즘 테스트
- API 엔드포인트 테스트

### 통합 테스트
- E2E 업로드 플로우
- 에러 시나리오
- 성능 테스트

### 사용자 테스트
- 실제 파일로 테스트
- 사용성 피드백
- 개선사항 반영

## 📅 일정

- **Day 1**: Phase 1-2 완료 (기본 구조 및 매칭)
- **Day 2**: Phase 3-4 완료 (업로드 및 개선)
- **Day 3**: Phase 5 완료 (테스트 및 배포)

**총 예상 소요 시간**: 10시간 (2-3일)

## 🔗 관련 문서

- [PayrollExcelUploadWithPreview 구현](./completed/payroll-excel-preview-implementation-completed.md)
- [PayslipManagement 구현](./completed/payroll-display-issues-analysis-completed.md)
- [Employee Matching 구현](./completed/employee-matching-implementation-completed.md)