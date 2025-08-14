# ErrorLoggingMonitoringService 리팩토링 계획

## 📊 현재 상태 분석

### 파일 정보
- **파일**: `backend/services/ErrorLoggingMonitoringService.js`
- **현재 라인 수**: 1,068줄
- **목표**: 각 파일 300-400줄 이하로 분할

### 현재 구조 분석
```
ErrorLoggingMonitoringService (1,068줄)
├── 초기화 및 설정 (60줄)
├── 에러 로깅 (196줄)
├── 감사 추적 (34줄)
├── 에러 분류 (138줄)
├── 모니터링 수집 (197줄)
├── 알림 시스템 (152줄)
├── 분석 및 리포트 (205줄)
└── 클린업 (86줄)
```

### 주요 기능
1. **에러 로깅**: 에러 발생 시 상세 정보 저장
2. **감사 추적**: 민감한 작업(급여 수정 등) 기록
3. **시스템 모니터링**: CPU, 메모리, DB 메트릭 수집
4. **알림 시스템**: 임계값 초과 시 알림 발생
5. **분석/리포트**: 에러 패턴 분석 및 시스템 헬스 체크
6. **자동 클린업**: 오래된 로그 자동 삭제

## 🎯 리팩토링 목표

### 주요 목표
1. **단일 책임 원칙 적용**: 각 클래스가 하나의 명확한 책임만 가짐
2. **코드 재사용성 향상**: 공통 로직 추출 및 유틸리티 함수 생성
3. **테스트 용이성**: 각 모듈 독립적으로 테스트 가능
4. **유지보수성**: 기능별 분리로 수정 영향 범위 최소화
5. **성능 최적화**: 모니터링 로직 비동기 처리 개선

### 파일 크기 목표
- 각 서비스 파일: 200-350줄
- 유틸리티 파일: 100-200줄
- 설정 파일: 50-100줄

## 📁 제안된 모듈 구조

```
backend/services/
├── monitoring/
│   ├── ErrorLoggingService.js         (300줄) - 에러 로깅 핵심 기능
│   ├── AuditTrailService.js          (200줄) - 감사 추적 전용
│   ├── SystemMonitoringService.js     (350줄) - 시스템 메트릭 수집
│   ├── AlertingService.js            (250줄) - 알림 관리 및 발송
│   ├── AnalyticsService.js           (300줄) - 분석 및 리포트 생성
│   ├── utils/
│   │   ├── ErrorClassifier.js        (150줄) - 에러 분류 로직
│   │   ├── MetricsCollector.js       (200줄) - 메트릭 수집 헬퍼
│   │   └── DataRetentionManager.js   (100줄) - 데이터 보존 관리
│   ├── config/
│   │   └── monitoringConfig.js       (80줄)  - 모니터링 설정
│   └── index.js                       (50줄)  - 통합 인터페이스
```

## 🔄 리팩토링 단계

### Phase 1: 준비 작업 (1시간)
1. 백업 생성 및 테스트 환경 준비
2. 새 디렉토리 구조 생성
3. 공통 설정 파일 생성

### Phase 2: 코어 서비스 분리 (2시간)
1. **ErrorLoggingService 추출**
   - `logError()` 메서드
   - 에러 저장 로직
   - 인덱스 생성

2. **AuditTrailService 추출**
   - `logAuditTrail()` 메서드
   - 감사 로그 저장
   - 규정 준수 관련 기능

### Phase 3: 모니터링 서비스 분리 (2시간)
1. **SystemMonitoringService 생성**
   - `collectMetrics()`
   - `measureEventLoopDelay()`
   - `getGCStats()`
   - `collectDatabaseMetrics()`
   - `collectCustomMetrics()`

2. **AlertingService 생성**
   - `checkAlertConditions()`
   - `checkMetricAlerts()`
   - `triggerAlert()`
   - 쿨다운 관리

### Phase 4: 분석 서비스 분리 (1.5시간)
1. **AnalyticsService 생성**
   - `getErrorAnalytics()`
   - `getSystemHealth()`
   - 리포트 생성 로직

### Phase 5: 유틸리티 추출 (1.5시간)
1. **ErrorClassifier 생성**
   - `determineSeverity()`
   - `determineCategory()`
   - `generateErrorFingerprint()`

2. **MetricsCollector 생성**
   - 메트릭 수집 헬퍼 함수들

3. **DataRetentionManager 생성**
   - `performManualCleanup()`
   - TTL 인덱스 관리

### Phase 6: 통합 및 마이그레이션 (1시간)
1. 통합 인터페이스 생성 (index.js)
2. 기존 참조 업데이트
3. 이전 파일 제거

### Phase 7: 테스트 및 검증 (1시간)
1. 단위 테스트 실행
2. 통합 테스트 실행
3. 성능 테스트
4. 로그 검증

## 💡 리팩토링 원칙

### 1. 의존성 주입
```javascript
// Before
class ErrorLoggingMonitoringService {
  constructor(db) {
    this.db = db;
    this.errorLogCollection = db.collection('error_logs');
  }
}

// After
class ErrorLoggingService {
  constructor({ db, config, classifier }) {
    this.db = db;
    this.config = config;
    this.classifier = classifier;
  }
}
```

### 2. 인터페이스 분리
```javascript
// 각 서비스별 명확한 인터페이스
interface IErrorLogger {
  logError(error, context)
}

interface IAuditLogger {
  logAuditTrail(auditData)
}

interface ISystemMonitor {
  collectMetrics()
  getSystemHealth()
}
```

### 3. 이벤트 기반 통신
```javascript
// 서비스 간 느슨한 결합
errorLogger.on('critical-error', (error) => {
  alertingService.checkAlertConditions(error);
});
```

## 🚨 위험 요소 및 대응 방안

### 위험 요소
1. **서비스 간 순환 의존성**
   - 대응: 명확한 의존성 방향 설정, 이벤트 기반 통신 사용

2. **기존 코드 호환성 문제**
   - 대응: 하위 호환성 유지를 위한 어댑터 패턴 적용

3. **성능 저하**
   - 대응: 모니터링 메트릭으로 성능 측정, 필요시 캐싱 적용

4. **데이터 일관성**
   - 대응: 트랜잭션 보장, 롤백 메커니즘 구현

## 📊 예상 결과

### Before (1개 파일)
```
ErrorLoggingMonitoringService.js - 1,068줄
```

### After (10개 파일)
```
ErrorLoggingService.js         - 300줄
AuditTrailService.js          - 200줄
SystemMonitoringService.js     - 350줄
AlertingService.js            - 250줄
AnalyticsService.js           - 300줄
ErrorClassifier.js            - 150줄
MetricsCollector.js           - 200줄
DataRetentionManager.js       - 100줄
monitoringConfig.js           - 80줄
index.js                      - 50줄
-----------------------------------------
총합                          - 1,980줄 (코드 정리 및 개선 포함)
```

## ✅ 완료 체크리스트

- [ ] Phase 1: 준비 작업 완료
- [ ] Phase 2: 코어 서비스 분리 완료
- [ ] Phase 3: 모니터링 서비스 분리 완료
- [ ] Phase 4: 분석 서비스 분리 완료
- [ ] Phase 5: 유틸리티 추출 완료
- [ ] Phase 6: 통합 및 마이그레이션 완료
- [ ] Phase 7: 테스트 및 검증 완료
- [ ] 문서 업데이트 완료
- [ ] 코드 리뷰 완료
- [ ] 프로덕션 배포 준비 완료

## 📝 추가 고려사항

### 성능 최적화
- 배치 처리로 DB 쓰기 최적화
- 메트릭 수집 주기 조정 가능하도록 설정
- 비동기 처리 강화

### 확장성
- 플러그인 아키텍처로 새 모니터링 추가 용이
- 외부 모니터링 서비스 연동 준비 (Datadog, New Relic 등)
- 마이크로서비스 전환 고려

### 보안
- PII 데이터 마스킹 강화
- 로그 접근 권한 세분화
- 암호화된 로그 저장 옵션

## 🔗 의존성 분석 및 마이그레이션

### 현재 사용 현황
ErrorLoggingMonitoringService를 참조하는 파일들:

1. **backend/server.js**
   - 전역 인스턴스 생성: `global.errorLoggingService`
   - 초기화 위치: MongoDB 연결 후

2. **backend/routes/payroll.js**
   - `logAuditTrail()` 호출 (라인 424)
   - 급여 수정 시 감사 추적 로깅

3. **backend/repositories/PayrollRepository.js**
   - `logAuditTrail()` 호출 (라인 124)
   - 급여 데이터 업데이트 시 감사 추적

4. **backend/middleware/errorHandler.js** (잠재적 통합 대상)
   - 현재는 ErrorLoggingMonitoringService를 사용하지 않음
   - 에러 발생 시 console.error로만 로깅
   - 통합 시 중앙화된 에러 로깅 가능

### 마이그레이션 전략

#### 1. 통합 인터페이스 제공
```javascript
// backend/services/monitoring/index.js
class MonitoringService {
  constructor(db) {
    this.errorLogger = new ErrorLoggingService({ db, config });
    this.auditTrail = new AuditTrailService({ db, config });
    this.systemMonitor = new SystemMonitoringService({ db, config });
    this.alerting = new AlertingService({ db, config });
    this.analytics = new AnalyticsService({ db, config });
  }
  
  // 하위 호환성을 위한 메서드
  async logError(error, context) {
    return this.errorLogger.logError(error, context);
  }
  
  async logAuditTrail(auditData) {
    return this.auditTrail.logAuditTrail(auditData);
  }
  
  async getSystemHealth() {
    return this.analytics.getSystemHealth();
  }
}

// 기존 클래스명으로 export (하위 호환성)
module.exports = MonitoringService;
module.exports.ErrorLoggingMonitoringService = MonitoringService;
```

#### 2. server.js 업데이트
```javascript
// 변경 전
const ErrorLoggingMonitoringService = require('./services/ErrorLoggingMonitoringService');
global.errorLoggingService = new ErrorLoggingMonitoringService(db);

// 변경 후 (Phase 6에서 적용)
const MonitoringService = require('./services/monitoring');
global.errorLoggingService = new MonitoringService(db);
// 또는 더 명확한 이름으로 변경
global.monitoringService = new MonitoringService(db);
```

#### 3. 단계적 마이그레이션

**Phase 6-1: 어댑터 패턴 적용**
- 기존 인터페이스 유지하면서 내부적으로 새 모듈 사용
- `global.errorLoggingService` 그대로 유지
- 모든 기존 메서드 하위 호환성 보장

**Phase 6-2: 참조 업데이트**
- `backend/routes/payroll.js` 업데이트
- `backend/repositories/PayrollRepository.js` 업데이트
- 변경 최소화: 메서드 시그니처 동일하게 유지

**Phase 6-3: 테스트 및 검증**
- 감사 추적 로깅 동작 확인
- 급여 수정 시 로그 생성 확인
- 에러 로깅 기능 테스트

### 의존성 매핑 테이블

| 파일 | 사용 메서드 | 용도 | 마이그레이션 영향도 |
|------|------------|------|-------------------|
| server.js | constructor | 서비스 초기화 | 낮음 (인터페이스 유지) |
| routes/payroll.js | logAuditTrail | 급여 수정 감사 | 없음 (메서드 유지) |
| repositories/PayrollRepository.js | logAuditTrail | 데이터 변경 감사 | 없음 (메서드 유지) |

### 위험 완화 방안

1. **무중단 마이그레이션**
   - 어댑터 패턴으로 기존 인터페이스 100% 호환
   - 점진적 마이그레이션으로 위험 분산

2. **롤백 계획**
   - 각 Phase별 백업 포인트 생성
   - 문제 발생 시 이전 버전으로 즉시 복구

3. **테스트 커버리지**
   - 기존 기능 테스트 케이스 작성
   - 마이그레이션 후 회귀 테스트 실행

### 추가 통합 기회

#### ErrorHandler 미들웨어 통합
현재 `backend/middleware/errorHandler.js`는 에러를 console.error로만 로깅하고 있습니다. 리팩토링 후 통합 가능:

```javascript
// backend/middleware/errorHandler.js 개선안
const errorHandler = (err, req, res, next) => {
  // 기존 console.error 대신 ErrorLoggingService 사용
  if (global.monitoringService) {
    global.monitoringService.logError(err, {
      userId: req.user?.id,
      route: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      sessionId: req.session?.id,
      statusCode: res.statusCode
    });
  }
  
  // 기존 에러 응답 로직 유지
  // ...
};
```

이를 통해:
- 모든 에러가 중앙화된 로깅 시스템에 기록
- 에러 패턴 분석 및 알림 자동화
- 프로덕션 환경에서의 디버깅 개선

## 🕐 예상 소요 시간
- 총 소요 시간: 약 10시간
- 권장 작업 일정: 2-3일에 걸쳐 단계적 진행

## 📌 다음 단계
1. 이 계획 검토 및 승인
2. Phase 1 시작: 백업 및 환경 준비
3. 단계별 진행 상황 추적