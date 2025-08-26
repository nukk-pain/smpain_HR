# REFACTOR-08: ErrorLoggingMonitoringService.js 리팩토링 계획

## 📊 현재 상태
- **파일**: `backend/services/ErrorLoggingMonitoringService.js`
- **현재 크기**: 1,068줄
- **목표**: 1,000줄 이하로 분할
- **생성일**: 2025년 08월 25일

## 🎯 리팩토링 목표
1. 단일 책임 원칙(SRP) 적용으로 코드 가독성 향상
2. 모듈별 독립적 테스트 가능
3. 유지보수성 및 확장성 개선
4. 각 파일 1,000줄 이하 유지

## 📋 현재 기능 분석

### 주요 메서드 (22개)
1. **초기화**: initialize()
2. **에러 로깅**: logError(), logAuditTrail()
3. **에러 분류**: determineSeverity(), determineCategory(), generateErrorFingerprint()
4. **모니터링**: startMonitoring(), stopMonitoring(), collectMetrics()
5. **메트릭 수집**: measureEventLoopDelay(), getGCStats(), collectDatabaseMetrics(), collectCustomMetrics()
6. **알림**: checkAlertConditions(), checkMetricAlerts(), triggerAlert()
7. **알림 제어**: isAlertCooledDown(), setAlertCooldown()
8. **분석**: getErrorAnalytics(), getSystemHealth()
9. **유지보수**: performManualCleanup()

## 🔨 리팩토링 계획

### Phase 1: 서비스 분할 구조
```
services/
├── ErrorLoggingMonitoringService.js (메인 파일, ~200줄)
├── logging/
│   ├── ErrorLogger.js (~250줄)
│   └── AuditLogger.js (~150줄)
├── monitoring/
│   ├── MetricsCollector.js (~300줄)
│   └── SystemHealthMonitor.js (~200줄)
├── alerting/
│   ├── AlertManager.js (~250줄)
│   └── AlertThresholds.js (~100줄)
└── analytics/
    └── ErrorAnalytics.js (~200줄)
```

### Phase 2: 모듈별 책임 분리

#### 1. ErrorLogger.js (에러 로깅 전담)
- logError()
- determineSeverity()
- determineCategory()
- generateErrorFingerprint()

#### 2. AuditLogger.js (감사 로그 전담)
- logAuditTrail()
- 감사 로그 관련 인덱스 생성

#### 3. MetricsCollector.js (메트릭 수집)
- collectMetrics()
- measureEventLoopDelay()
- getGCStats()
- collectDatabaseMetrics()
- collectCustomMetrics()

#### 4. SystemHealthMonitor.js (시스템 모니터링)
- startMonitoring()
- stopMonitoring()
- getSystemHealth()

#### 5. AlertManager.js (알림 관리)
- checkAlertConditions()
- checkMetricAlerts()
- triggerAlert()
- isAlertCooledDown()
- setAlertCooldown()

#### 6. ErrorAnalytics.js (분석 및 리포팅)
- getErrorAnalytics()
- performManualCleanup()

### Phase 3: 공통 설정 관리
```javascript
// config/monitoringConfig.js
module.exports = {
  retention: {
    errorLogsDays: 90,
    monitoringDataDays: 30,
    alertHistoryDays: 365
  },
  alertThresholds: {
    criticalErrorsPerMinute: 1,
    errorRatePerMinute: 10,
    memoryUsagePercent: 85,
    cpuUsagePercent: 80,
    responseTimeMs: 2000,
    dbConnectionPoolThreshold: 45
  },
  monitoring: {
    intervalMs: 60000,
    enableSystemMetrics: true,
    enableApplicationMetrics: true,
    enableDatabaseMetrics: true
  }
};
```

## 📅 수정된 실행 계획

### Phase 0: 준비 단계 (30분)
- [ ] 기존 서비스 백업
- [ ] Feature flag 설정
- [ ] 성능 기준선 측정
- [ ] 종속성 맵핑 문서화

### Step 1: 핵심 인프라 구축 (40분)
- [ ] services/core/BaseService.js 생성
- [ ] services/core/ServiceContainer.js 생성
- [ ] services/core/DatabaseManager.js 생성
- [ ] services/core/ErrorHandler.js 생성
- [ ] services/core/LoggerFactory.js 생성
- [ ] config/monitoringConfig.js 생성

### Step 2: 인터페이스 정의 (20분)
- [ ] services/interfaces/ 디렉토리 생성
- [ ] 각 모듈 인터페이스 정의
- [ ] DTO 클래스 생성

### Step 3: 설정 파일 분리 (10분)
- [ ] config/monitoringConfig.js 생성
- [ ] 설정 값 이동 및 export

### Step 2: ErrorLogger 모듈 생성 (30분)
- [ ] services/logging/ErrorLogger.js 생성
- [ ] 에러 로깅 관련 메서드 이동
- [ ] 테스트 작성

### Step 3: AuditLogger 모듈 생성 (20분)
- [ ] services/logging/AuditLogger.js 생성
- [ ] 감사 로그 관련 메서드 이동
- [ ] 테스트 작성

### Step 4: MetricsCollector 모듈 생성 (30분)
- [ ] services/monitoring/MetricsCollector.js 생성
- [ ] 메트릭 수집 관련 메서드 이동
- [ ] 테스트 작성

### Step 5: AlertManager 모듈 생성 (30분)
- [ ] services/alerting/AlertManager.js 생성
- [ ] 알림 관련 메서드 이동
- [ ] 테스트 작성

### Step 6: SystemHealthMonitor 모듈 생성 (20분)
- [ ] services/monitoring/SystemHealthMonitor.js 생성
- [ ] 시스템 모니터링 메서드 이동
- [ ] 테스트 작성

### Step 7: ErrorAnalytics 모듈 생성 (20분)
- [ ] services/analytics/ErrorAnalytics.js 생성
- [ ] 분석 관련 메서드 이동
- [ ] 테스트 작성

### Step 8: 메인 서비스 재구성 (30분)
- [ ] ErrorLoggingMonitoringService.js를 조정자(Orchestrator)로 변경
- [ ] 모든 모듈 import 및 연결
- [ ] 통합 테스트 작성

### Step 9: 기존 참조 업데이트 (20분)
- [ ] server.js에서 import 경로 확인
- [ ] 다른 서비스에서 사용하는 부분 확인 및 업데이트

### Step 10: 검증 (20분)
- [ ] 모든 테스트 실행
- [ ] 에러 로깅 기능 동작 확인
- [ ] 모니터링 기능 동작 확인
- [ ] 알림 기능 동작 확인

### Step 11: 성능 검증 (30분)
- [ ] 응답 시간 비교
- [ ] 메모리 사용량 비교
- [ ] CPU 사용량 비교
- [ ] 데이터베이스 쿼리 성능 비교

### Step 12: 점진적 배포 (1시간)
- [ ] Feature flag 10% 활성화
- [ ] 모니터링 및 로그 확인
- [ ] 50% 활성화
- [ ] 100% 활성화
- [ ] 이전 코드 deprecation 마킹

### Step 13: 문서화 (30분)
- [ ] API 문서 생성
- [ ] 모듈 간 상호작용 다이어그램
- [ ] 마이그레이션 가이드
- [ ] 트러블슈팅 가이드

## ⚠️ 주의 사항
1. MongoDB 연결 공유 방식 유지
2. 기존 API 인터페이스 변경 없음
3. 에러 로그 형식 유지
4. 모니터링 간격 설정 유지
5. 알림 쿨다운 메커니즘 보존

## 🔄 누락된 중요 사항 추가

### 1. 종속성 관리 및 순환 참조 방지
```javascript
// services/core/BaseService.js
class BaseService {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger;
    this.db = dependencies.db;
    this.config = dependencies.config;
  }
}

// Dependency Injection Container
// services/core/ServiceContainer.js
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }
  
  register(name, factory, options = {}) {
    this.services.set(name, { factory, ...options });
  }
  
  get(name) {
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }
    // Create instance with dependencies
  }
}
```

### 2. 데이터베이스 연결 관리
```javascript
// services/core/DatabaseManager.js
class DatabaseManager {
  constructor() {
    this.connection = null;
    this.connectionPromise = null;
  }
  
  async getConnection() {
    if (this.connection) return this.connection;
    if (this.connectionPromise) return this.connectionPromise;
    
    this.connectionPromise = this.connect();
    this.connection = await this.connectionPromise;
    return this.connection;
  }
  
  // Singleton pattern for connection sharing
}

module.exports = new DatabaseManager();
```

### 3. 에러 처리 전략
```javascript
// services/core/ErrorHandler.js
class ModuleErrorHandler {
  static async handleServiceError(error, context) {
    // Log to central error logger
    // Determine if error should bubble up
    // Apply retry logic if appropriate
    // Track error metrics
  }
  
  static wrapAsync(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleServiceError(error, context);
      }
    };
  }
}
```

### 4. 모듈 간 인터페이스 정의
```javascript
// services/interfaces/IErrorLogger.js
class IErrorLogger {
  async logError(error, context) { throw new Error('Not implemented'); }
  async determineSeverity(error) { throw new Error('Not implemented'); }
}

// services/interfaces/IMetricsCollector.js
class IMetricsCollector {
  async collectMetrics() { throw new Error('Not implemented'); }
  async getSystemHealth() { throw new Error('Not implemented'); }
}

// Data Transfer Objects
// services/dto/ErrorLogDTO.js
class ErrorLogDTO {
  constructor(data) {
    this.timestamp = data.timestamp;
    this.message = data.message;
    this.severity = data.severity;
    this.category = data.category;
    this.fingerprint = data.fingerprint;
    this.metadata = data.metadata;
  }
  
  validate() {
    // Validation logic
  }
}
```

### 5. 점진적 마이그레이션 전략
```javascript
// Phase 1: Create new modules alongside existing service
// Phase 2: Proxy method calls through new modules
// Phase 3: Deprecate old methods with warnings
// Phase 4: Remove deprecated code

// services/ErrorLoggingMonitoringService.js (transition phase)
class ErrorLoggingMonitoringService {
  constructor() {
    // Initialize new modules
    this.errorLogger = new ErrorLogger();
    this.metricsCollector = new MetricsCollector();
    // ... other modules
  }
  
  // Proxy methods during transition
  async logError(...args) {
    console.warn('Deprecated: Use ErrorLogger directly');
    return this.errorLogger.logError(...args);
  }
}
```

### 6. 롤백 계획
- **Feature Flag 구현**:
```javascript
// config/featureFlags.js
module.exports = {
  useModularErrorService: process.env.USE_MODULAR_ERROR_SERVICE === 'true',
  // Gradual rollout percentage
  modularServiceRolloutPercentage: parseInt(process.env.MODULAR_ROLLOUT_PCT || '0')
};

// server.js
const errorService = featureFlags.useModularErrorService 
  ? require('./services/ErrorLoggingMonitoringService') // New modular version
  : require('./services/legacy/ErrorLoggingMonitoringService'); // Old version
```

### 7. 성능 모니터링
```javascript
// services/core/PerformanceMonitor.js
class PerformanceMonitor {
  static measureModulePerformance(moduleName, methodName) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const start = process.hrtime.bigint();
        try {
          const result = await originalMethod.apply(this, args);
          const end = process.hrtime.bigint();
          const duration = Number(end - start) / 1000000; // Convert to ms
          
          // Log performance metrics
          metrics.recordMethodDuration(moduleName, methodName, duration);
          
          return result;
        } catch (error) {
          metrics.recordMethodError(moduleName, methodName);
          throw error;
        }
      };
    };
  }
}
```

### 8. 로깅 일관성 유지
```javascript
// services/core/LoggerFactory.js
class LoggerFactory {
  static createLogger(moduleName) {
    return {
      info: (message, meta) => this.log('info', moduleName, message, meta),
      error: (message, error, meta) => this.log('error', moduleName, message, { error, ...meta }),
      warn: (message, meta) => this.log('warn', moduleName, message, meta),
      debug: (message, meta) => this.log('debug', moduleName, message, meta)
    };
  }
  
  static log(level, module, message, meta) {
    // Centralized logging with consistent format
    const logEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      ...meta,
      correlationId: AsyncLocalStorage.getStore()?.correlationId
    };
    // Write to log destination
  }
}
```

### 9. 테스트 전략 상세
```javascript
// tests/unit/services/ErrorLogger.test.js
describe('ErrorLogger Unit Tests', () => {
  let errorLogger;
  let mockDb;
  
  beforeEach(() => {
    mockDb = createMockDatabase();
    errorLogger = new ErrorLogger({ db: mockDb });
  });
  
  // Test each method in isolation
});

// tests/integration/services/ErrorLoggingMonitoring.test.js
describe('Error Logging Monitoring Integration', () => {
  let serviceContainer;
  
  beforeAll(async () => {
    // Setup real database connection
    // Initialize all services
    serviceContainer = await setupServiceContainer();
  });
  
  // Test module interactions
});

// tests/e2e/errorLogging.test.js
describe('Error Logging E2E Tests', () => {
  // Test complete error logging flow
  // Test monitoring data collection
  // Test alert triggering
});
```

### 10. API 문서화
```javascript
// docs/api/error-logging-service.md
/**
 * Error Logging Service API Documentation
 * 
 * ## Module Structure
 * - ErrorLogger: Handles error logging
 * - MetricsCollector: Collects system metrics
 * - AlertManager: Manages alerts
 * 
 * ## Inter-module Communication
 * [Sequence diagrams and flow charts]
 * 
 * ## Public API
 * [Method signatures and descriptions]
 */

// JSDoc for auto-generation
/**
 * @module ErrorLogger
 * @description Handles error logging and categorization
 */

/**
 * Logs an error to the database
 * @async
 * @param {Error} error - The error object to log
 * @param {Object} context - Additional context information
 * @returns {Promise<string>} The error log ID
 * @throws {DatabaseError} If database operation fails
 */
```

## 🎯 예상 결과
- **ErrorLoggingMonitoringService.js**: ~200줄 (조정자 역할)
- **각 모듈**: 100-300줄 범위
- **총 코드 라인**: 기존과 동일하나 분산
- **테스트 커버리지**: 향상
- **유지보수성**: 크게 개선

## 📈 성공 지표
- [ ] 모든 파일 1,000줄 이하
- [ ] 기존 기능 100% 동작
- [ ] 단위 테스트 커버리지 80% 이상
- [ ] 통합 테스트 100% 통과
- [ ] 에러 로깅 정상 동작
- [ ] 모니터링 데이터 수집 정상
- [ ] 알림 발송 정상
- [ ] 성능 저하 없음 (±5% 이내)
- [ ] 메모리 누수 없음
- [ ] 순환 참조 없음
- [ ] 모든 모듈 독립적 테스트 가능
- [ ] API 문서 100% 완성

## 🚨 리스크 관리

### 잠재적 리스크
1. **데이터베이스 연결 끊김**: DatabaseManager 싱글톤 패턴으로 해결
2. **순환 참조**: 의존성 주입과 인터페이스 사용으로 방지
3. **성능 저하**: 모듈 간 통신 오버헤드 최소화
4. **호환성 문제**: Feature flag로 점진적 마이그레이션
5. **에러 누락**: 중앙화된 에러 핸들러로 모든 에러 캐치

### 비상 계획
1. **즉시 롤백 가능**: Feature flag OFF
2. **부분 롤백**: 문제 있는 모듈만 이전 버전 사용
3. **핫픽스**: 긴급 패치를 위한 별도 브랜치 준비
4. **모니터링 강화**: 배포 후 24시간 집중 모니터링

## 🔐 추가 고려사항

### 1. 버전 관리 전략
```javascript
// services/core/Version.js
class ServiceVersion {
  static VERSION = '2.0.0';
  static COMPATIBLE_WITH = ['1.9.x', '2.x.x'];
  
  static checkCompatibility(version) {
    // Version compatibility check logic
  }
}

// Migration versioning
// migrations/v1_to_v2.js
module.exports = {
  version: '2.0.0',
  from: '1.x.x',
  migrate: async (oldService) => {
    // Migration logic
  }
};
```

### 2. 환경별 배포 전략
```javascript
// config/environments.js
module.exports = {
  development: {
    useModularService: true,
    enableDebugLogging: true,
    performanceMonitoring: false
  },
  staging: {
    useModularService: true,
    enableDebugLogging: false,
    performanceMonitoring: true,
    rolloutPercentage: 50
  },
  production: {
    useModularService: false, // Start with false
    enableDebugLogging: false,
    performanceMonitoring: true,
    rolloutPercentage: 0 // Gradually increase
  }
};
```

### 3. 백워드 호환성 보장
```javascript
// services/ErrorLoggingMonitoringService.js
class ErrorLoggingMonitoringService {
  // Maintain backward compatibility
  async logError(error, context) {
    // Old signature support
    if (typeof error === 'string') {
      error = new Error(error);
    }
    
    // New modular approach
    return this.errorLogger.log({
      error,
      context,
      version: 'v2'
    });
  }
  
  // Adapter pattern for legacy calls
  static createLegacyAdapter() {
    return {
      log: this.prototype.logError.bind(this),
      monitor: this.prototype.startMonitoring.bind(this)
    };
  }
}
```

### 4. 캐싱 전략
```javascript
// services/core/CacheManager.js
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }
  
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlSeconds * 1000);
  }
  
  get(key) {
    if (this.ttl.has(key) && Date.now() > this.ttl.get(key)) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
  
  // For frequently accessed configurations
  memoize(fn, keyGenerator) {
    return async (...args) => {
      const key = keyGenerator(...args);
      const cached = this.get(key);
      if (cached) return cached;
      
      const result = await fn(...args);
      this.set(key, result);
      return result;
    };
  }
}
```

### 5. 보안 고려사항
```javascript
// services/core/SecurityValidator.js
class SecurityValidator {
  static sanitizeLogData(data) {
    // Remove sensitive information
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  static validateInput(input, schema) {
    // Input validation to prevent injection
    return Joi.validate(input, schema);
  }
  
  static rateLimit(key, maxRequests = 100, windowMs = 60000) {
    // Rate limiting for API endpoints
  }
}

// Apply to all logging
class SecureErrorLogger extends ErrorLogger {
  async logError(error, context) {
    const sanitizedContext = SecurityValidator.sanitizeLogData(context);
    return super.logError(error, sanitizedContext);
  }
}
```

### 6. 모듈 초기화 순서 관리
```javascript
// services/core/InitializationManager.js
class InitializationManager {
  static async initializeServices() {
    const initOrder = [
      'DatabaseManager',
      'LoggerFactory',
      'CacheManager',
      'ErrorLogger',
      'MetricsCollector',
      'AlertManager'
    ];
    
    for (const serviceName of initOrder) {
      console.log(`Initializing ${serviceName}...`);
      await this.initializeService(serviceName);
    }
  }
  
  static async shutdownServices() {
    // Graceful shutdown in reverse order
  }
}
```

### 7. 상태 건전성 체크
```javascript
// services/core/HealthCheck.js
class HealthCheck {
  static async checkModuleHealth() {
    const checks = {
      database: await this.checkDatabase(),
      errorLogger: await this.checkErrorLogger(),
      metricsCollector: await this.checkMetrics(),
      alertManager: await this.checkAlerts()
    };
    
    return {
      healthy: Object.values(checks).every(c => c.healthy),
      checks,
      timestamp: new Date()
    };
  }
  
  static async checkDatabase() {
    try {
      const db = await DatabaseManager.getConnection();
      await db.admin().ping();
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}
```

### 8. 트랜잭션 관리
```javascript
// services/core/TransactionManager.js
class TransactionManager {
  async executeInTransaction(operations) {
    const session = await this.startSession();
    
    try {
      await session.withTransaction(async () => {
        for (const operation of operations) {
          await operation(session);
        }
      });
    } finally {
      await session.endSession();
    }
  }
}
```