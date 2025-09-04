# Excel Processor 리팩토링 계획 (기존 파일 재활용)

## 현재 상태 분석
- **메인 파일**: `/backend/excelProcessor.js` (90KB, 2,648+ 라인)
- **기존 관련 파일들**: 이미 기능별로 어느 정도 분리되어 있음
  - `excelProcessorRecovery.js` (17KB) - 에러 복구
  - `utils/excelAnalyzer.js` - Excel 구조 분석
  - `utils/laborConsultantParser.js` - 특정 형식 파싱
  - `utils/fieldConverter.js` - 필드명 변환
  - `reportGenerator.js` - 리포트 생성
  - `incentiveCalculator.js` - 인센티브 계산

## 기존 파일 재활용 전략

### 1. 최소 변경 접근법 (권장)
**기존 파일들은 그대로 두고, 메인 excelProcessor.js만 분할**

```
backend/
├── services/
│   └── excel/
│       ├── ExcelParserService.js          # excelProcessor.js에서 파싱 부분만 분리
│       ├── PayrollExcelService.js         # excelProcessor.js에서 급여 특화 부분 분리
│       ├── ExcelCacheService.js           # excelProcessor.js에서 캐싱 부분 분리
│       └── index.js                       # 통합 서비스
├── excelProcessorRecovery.js              # 기존 위치 유지
├── reportGenerator.js                     # 기존 위치 유지
├── incentiveCalculator.js                 # 기존 위치 유지
└── utils/
    ├── excelAnalyzer.js                   # 기존 위치 유지
    ├── laborConsultantParser.js           # 기존 위치 유지
    └── fieldConverter.js                  # 기존 위치 유지
```

### 2. 기존 파일 활용 방안

#### A. 기존 파일들 그대로 활용
- **excelProcessorRecovery.js**: 에러 복구 로직이 이미 잘 구성됨 → 그대로 사용
- **utils/excelAnalyzer.js**: Excel 구조 분석 기능 → 확장하여 사용
- **utils/laborConsultantParser.js**: 특정 형식 파싱 → 그대로 사용
- **utils/fieldConverter.js**: 필드명 변환 → 그대로 사용
- **reportGenerator.js**: 리포트 생성 → 그대로 사용
- **incentiveCalculator.js**: 인센티브 계산 → 그대로 사용

#### B. excelProcessor.js 분할 계획
**90KB 파일을 3개 파일로 분할:**

1. **ExcelParserService.js** (30KB 예상)
   - validateFile()
   - parseExcelFile()
   - parsePayrollExcel()
   - compareWithSystemData()

2. **PayrollExcelService.js** (40KB 예상)
   - parsePayrollExcelInChunks()
   - parsePayrollExcelStreaming()
   - parsePayrollExcelOptimized()
   - parsePayrollExcelFast()
   - processBatch()
   - parsePayrollExcelWithDetailedErrors()
   - parsePayrollExcelWithPartialFailure()

3. **ExcelCacheService.js** (20KB 예상)
   - parsePayrollExcelWithCache()
   - parsePayrollExcelWithRollback()
   - executeRollback()
   - cache 관련 로직

### 3. 구체적 분할 작업

#### Phase 1: 기본 파싱 서비스 분리
```javascript
// services/excel/ExcelParserService.js
class ExcelParserService {
  // excelProcessor.js에서 이동:
  // - validateFile() (라인 25-50)
  // - parseExcelFile() (라인 53-111)
  // - parsePayrollExcel() (라인 112-200)
  // - compareWithSystemData() (라인 201-270)
}
```

#### Phase 2: 급여 특화 서비스 분리
```javascript
// services/excel/PayrollExcelService.js
class PayrollExcelService {
  // excelProcessor.js에서 이동:
  // - parsePayrollExcelInChunks() (라인 584-743)
  // - parsePayrollExcelStreaming() (라인 744-948)
  // - parsePayrollExcelOptimized() (라인 1068-1315)
  // - parsePayrollExcelFast() (라인 1316-1614)
  // - 기타 급여 관련 메서드들
}
```

#### Phase 3: 캐싱 및 에러 처리 서비스 분리
```javascript
// services/excel/ExcelCacheService.js
class ExcelCacheService {
  // excelProcessor.js에서 이동:
  // - parsePayrollExcelWithCache() (라인 949-1067)
  // - parsePayrollExcelWithRollback() (라인 2474-2647)
  // - executeRollback() (라인 2648+)
  // - cache 관련 로직들
}
```

### 4. 통합 서비스
```javascript
// services/excel/index.js
const ExcelParserService = require('./ExcelParserService');
const PayrollExcelService = require('./PayrollExcelService');
const ExcelCacheService = require('./ExcelCacheService');

// 기존 파일들 import
const ExcelProcessorRecovery = require('../../excelProcessorRecovery');
const ReportGenerator = require('../../reportGenerator');
const IncentiveCalculator = require('../../incentiveCalculator');
const ExcelAnalyzer = require('../../utils/excelAnalyzer');

class ExcelService {
  constructor() {
    this.parser = new ExcelParserService();
    this.payroll = new PayrollExcelService();
    this.cache = new ExcelCacheService();
    
    // 기존 서비스들 통합
    this.recovery = new ExcelProcessorRecovery();
    this.generator = new ReportGenerator();
    this.calculator = new IncentiveCalculator();
    this.analyzer = new ExcelAnalyzer();
  }
  
  // 기존 ExcelProcessor 인터페이스 유지
  async parsePayrollExcel(buffer) {
    return this.parser.parsePayrollExcel(buffer);
  }
  
  async generateExcelFile(data, template) {
    return this.generator.generatePayrollExcelReport(data, template);
  }
  
  // 기타 기존 메서드들을 적절한 서비스로 위임
}

module.exports = ExcelService;
```

### 5. 마이그레이션 장점

#### 기존 파일 재활용의 이점:
1. **최소 변경**: 기존 파일들은 그대로 유지하여 안정성 확보
2. **점진적 개선**: excelProcessor.js만 분할하여 위험 최소화
3. **기존 테스트 유지**: 관련 테스트 코드들이 깨지지 않음
4. **Import 경로 최소 변경**: 기존 파일들의 import 경로 유지

#### 예상 작업량:
- **새로 생성**: 3개 파일 (ExcelParserService, PayrollExcelService, ExcelCacheService)
- **이동**: 0개 파일 (기존 파일들 위치 유지)
- **수정**: 기존 import 경로들만 새 통합 서비스로 변경

### 6. 구현 순서

1. **Phase 1**: services/excel/ 폴더 생성 및 ExcelParserService.js 분리
2. **Phase 2**: PayrollExcelService.js 분리
3. **Phase 3**: ExcelCacheService.js 분리
4. **Phase 4**: 통합 서비스 (index.js) 생성
5. **Phase 5**: 기존 import 경로들을 새 통합 서비스로 변경
6. **Phase 6**: 기존 excelProcessor.js 제거

### 7. 호환성 유지

```javascript
// 기존 코드와의 호환성을 위한 wrapper
// backend/excelProcessor.js (임시)
const ExcelService = require('./services/excel');
module.exports = ExcelService;
```

이렇게 하면 기존 파일들을 최대한 재활용하면서도 메인 파일의 크기 문제를 해결할 수 있습니다.

---
**추천**: 최소 변경 접근법으로 기존 파일들은 그대로 두고 excelProcessor.js만 분할하는 것이 가장 안전하고 효율적입니다.