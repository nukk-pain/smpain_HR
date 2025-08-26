# 하이브리드 인센티브 계산 시스템 구현 계획

## 🎉 구현 상태: ✅ 완료 (2025-08-19)

## 📋 개요
현재 시스템의 인센티브 계산 방식을 개선하여 4가지 기본 템플릿과 커스텀 수식을 모두 지원하는 하이브리드 시스템으로 업그레이드

### 목표
- 일반 사용자도 쉽게 설정 가능한 템플릿 기반 시스템
- 고급 사용자를 위한 커스텀 수식 지원
- 안전하고 검증된 계산 로직
- 실시간 미리보기 및 시뮬레이션 기능

## 🏗️ 구현 단계

### Phase 1: 데이터 구조 설계 (Backend)

#### 1.1 MongoDB 스키마 업데이트
```javascript
// users 컬렉션 - incentiveConfig 필드 추가
{
  incentiveConfig: {
    type: String, // 'PERSONAL_PERCENT', 'TOTAL_PERCENT', 'PERSONAL_EXCESS', 'TOTAL_EXCESS', 'CUSTOM'
    parameters: {
      rate: Number,        // 요율 (0.01 = 1%)
      threshold: Number,   // 기준 금액 (EXCESS 타입용)
      minAmount: Number,   // 최소 인센티브 금액
      maxAmount: Number,   // 최대 인센티브 금액 (cap)
    },
    customFormula: String,  // 커스텀 수식 (CUSTOM 타입용)
    isActive: Boolean,      // 활성화 여부
    effectiveDate: Date,    // 적용 시작일
    lastModified: Date,     // 마지막 수정일
    modifiedBy: ObjectId    // 수정한 관리자 ID
  }
}
```

#### 1.2 인센티브 타입 정의
```javascript
const INCENTIVE_TYPES = {
  PERSONAL_PERCENT: {
    name: '개인 매출 비율',
    description: '개인 매출의 X%',
    requiredParams: ['rate'],
    formula: 'personalSales * rate'
  },
  TOTAL_PERCENT: {
    name: '전체 매출 비율',
    description: '전체 매출의 X%',
    requiredParams: ['rate'],
    formula: 'totalSales * rate'
  },
  PERSONAL_EXCESS: {
    name: '개인 매출 초과분',
    description: '개인 매출 중 기준 금액 초과분의 X%',
    requiredParams: ['threshold', 'rate'],
    formula: 'max(0, personalSales - threshold) * rate'
  },
  TOTAL_EXCESS: {
    name: '전체 매출 초과분',
    description: '전체 매출 중 기준 금액 초과분의 X%',
    requiredParams: ['threshold', 'rate'],
    formula: 'max(0, totalSales - threshold) * rate'
  },
  CUSTOM: {
    name: '커스텀 수식',
    description: '사용자 정의 수식',
    requiredParams: [],
    formula: null
  }
};
```

### Phase 2: 백엔드 계산 엔진 구현

#### 2.1 새로운 IncentiveService 클래스
```javascript
// backend/services/IncentiveService.js
class IncentiveService {
  // 템플릿 기반 계산
  calculateByTemplate(type, parameters, salesData) {
    switch(type) {
      case 'PERSONAL_PERCENT':
        return this.applyLimits(
          salesData.personal * parameters.rate,
          parameters
        );
      
      case 'TOTAL_PERCENT':
        return this.applyLimits(
          salesData.total * parameters.rate,
          parameters
        );
      
      case 'PERSONAL_EXCESS':
        const personalExcess = Math.max(0, salesData.personal - parameters.threshold);
        return this.applyLimits(
          personalExcess * parameters.rate,
          parameters
        );
      
      case 'TOTAL_EXCESS':
        const totalExcess = Math.max(0, salesData.total - parameters.threshold);
        return this.applyLimits(
          totalExcess * parameters.rate,
          parameters
        );
      
      default:
        return 0;
    }
  }
  
  // 최소/최대 금액 적용
  applyLimits(amount, parameters) {
    if (parameters.minAmount && amount < parameters.minAmount) {
      return parameters.minAmount;
    }
    if (parameters.maxAmount && amount > parameters.maxAmount) {
      return parameters.maxAmount;
    }
    return Math.floor(amount); // 소수점 제거
  }
  
  // 커스텀 수식 계산 (기존 IncentiveCalculator 활용)
  calculateCustom(formula, salesData) {
    const calculator = new IncentiveCalculator();
    return calculator.calculate(formula, {
      personalSales: salesData.personal,
      totalSales: salesData.total,
      teamSales: salesData.team || 0
    });
  }
  
  // 메인 계산 함수
  async calculateIncentive(userId, yearMonth) {
    const user = await User.findById(userId);
    const salesData = await this.getSalesData(userId, yearMonth);
    
    if (!user.incentiveConfig || !user.incentiveConfig.isActive) {
      return { amount: 0, type: 'NONE', details: {} };
    }
    
    const config = user.incentiveConfig;
    let amount = 0;
    let details = {};
    
    if (config.type === 'CUSTOM' && config.customFormula) {
      amount = this.calculateCustom(config.customFormula, salesData);
      details = { formula: config.customFormula };
    } else {
      amount = this.calculateByTemplate(config.type, config.parameters, salesData);
      details = { 
        type: config.type,
        parameters: config.parameters,
        salesData: salesData
      };
    }
    
    return {
      amount,
      type: config.type,
      details,
      calculatedAt: new Date()
    };
  }
  
  // 시뮬레이션 함수
  async simulate(config, testSalesData) {
    if (config.type === 'CUSTOM') {
      return this.calculateCustom(config.customFormula, testSalesData);
    }
    return this.calculateByTemplate(config.type, config.parameters, testSalesData);
  }
}
```

#### 2.2 API 엔드포인트
```javascript
// backend/routes/incentive.js

// 인센티브 설정 조회
router.get('/config/:userId', requireAuth, async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json({
    success: true,
    data: user.incentiveConfig || getDefaultConfig()
  });
});

// 인센티브 설정 업데이트
router.put('/config/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { type, parameters, customFormula, isActive } = req.body;
  
  // 검증
  if (!INCENTIVE_TYPES[type]) {
    return res.status(400).json({ error: 'Invalid incentive type' });
  }
  
  // 필수 파라미터 체크
  const requiredParams = INCENTIVE_TYPES[type].requiredParams;
  for (const param of requiredParams) {
    if (parameters[param] === undefined) {
      return res.status(400).json({ error: `Missing required parameter: ${param}` });
    }
  }
  
  // 커스텀 수식 검증
  if (type === 'CUSTOM' && customFormula) {
    const validation = await validateFormula(customFormula);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
  }
  
  // 업데이트
  await User.findByIdAndUpdate(req.params.userId, {
    incentiveConfig: {
      type,
      parameters,
      customFormula,
      isActive,
      effectiveDate: req.body.effectiveDate || new Date(),
      lastModified: new Date(),
      modifiedBy: req.user.id
    }
  });
  
  res.json({ success: true });
});

// 인센티브 계산
router.post('/calculate', requireAuth, async (req, res) => {
  const { userId, yearMonth } = req.body;
  const service = new IncentiveService();
  const result = await service.calculateIncentive(userId, yearMonth);
  res.json({ success: true, data: result });
});

// 시뮬레이션
router.post('/simulate', requireAuth, async (req, res) => {
  const { config, salesData } = req.body;
  const service = new IncentiveService();
  const amount = await service.simulate(config, salesData);
  res.json({ success: true, amount });
});

// 배치 계산 (월별 전체 직원)
router.post('/batch-calculate', requireAuth, requireRole('admin'), async (req, res) => {
  const { yearMonth } = req.body;
  const service = new IncentiveService();
  
  const users = await User.find({ isActive: true });
  const results = [];
  
  for (const user of users) {
    const result = await service.calculateIncentive(user._id, yearMonth);
    results.push({
      userId: user._id,
      name: user.name,
      ...result
    });
  }
  
  res.json({ success: true, data: results });
});
```

### Phase 3: 프론트엔드 UI 구현

#### 3.1 인센티브 설정 컴포넌트
```typescript
// frontend/src/components/IncentiveConfig.tsx

interface IncentiveConfigProps {
  userId: string;
  isAdmin: boolean;
}

const IncentiveConfig: React.FC<IncentiveConfigProps> = ({ userId, isAdmin }) => {
  const [config, setConfig] = useState<IncentiveConfig>();
  const [testMode, setTestMode] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">인센티브 설정</Typography>
        
        {/* 기본 템플릿 선택 */}
        <FormControl fullWidth margin="normal">
          <InputLabel>인센티브 유형</InputLabel>
          <Select
            value={config?.type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <MenuItem value="PERSONAL_PERCENT">
              <ListItemText 
                primary="개인 매출 비율"
                secondary="개인 매출의 X%를 인센티브로 지급"
              />
            </MenuItem>
            <MenuItem value="TOTAL_PERCENT">
              <ListItemText 
                primary="전체 매출 비율"
                secondary="전체 매출의 X%를 인센티브로 지급"
              />
            </MenuItem>
            <MenuItem value="PERSONAL_EXCESS">
              <ListItemText 
                primary="개인 매출 초과분"
                secondary="개인 매출 중 기준 금액 초과분의 X%"
              />
            </MenuItem>
            <MenuItem value="TOTAL_EXCESS">
              <ListItemText 
                primary="전체 매출 초과분"
                secondary="전체 매출 중 기준 금액 초과분의 X%"
              />
            </MenuItem>
            {advancedMode && (
              <MenuItem value="CUSTOM">
                <ListItemText 
                  primary="커스텀 수식"
                  secondary="직접 수식 입력"
                />
              </MenuItem>
            )}
          </Select>
        </FormControl>
        
        {/* 파라미터 입력 */}
        {config?.type && config.type !== 'CUSTOM' && (
          <ParameterInputs 
            type={config.type}
            parameters={config.parameters}
            onChange={handleParametersChange}
          />
        )}
        
        {/* 커스텀 수식 입력 (고급 모드) */}
        {config?.type === 'CUSTOM' && (
          <CustomFormulaEditor
            formula={config.customFormula}
            onChange={handleFormulaChange}
            onValidate={validateFormula}
          />
        )}
        
        {/* 실시간 계산 미리보기 */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">계산 미리보기</Typography>
        <SimulationPanel 
          config={config}
          onCalculate={handleSimulate}
        />
        
        {/* 저장 버튼 */}
        {isAdmin && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={!isValid}
            >
              저장
            </Button>
            <FormControlLabel
              control={
                <Switch 
                  checked={advancedMode} 
                  onChange={(e) => setAdvancedMode(e.target.checked)}
                />
              }
              label="고급 모드"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 3.2 파라미터 입력 컴포넌트
```typescript
// frontend/src/components/ParameterInputs.tsx

const ParameterInputs: React.FC<Props> = ({ type, parameters, onChange }) => {
  const getFields = () => {
    switch(type) {
      case 'PERSONAL_PERCENT':
      case 'TOTAL_PERCENT':
        return (
          <>
            <TextField
              label="요율 (%)"
              type="number"
              value={parameters.rate * 100}
              onChange={(e) => onChange({ ...parameters, rate: Number(e.target.value) / 100 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="예: 5% = 5 입력"
            />
          </>
        );
      
      case 'PERSONAL_EXCESS':
      case 'TOTAL_EXCESS':
        return (
          <>
            <TextField
              label="기준 금액"
              type="number"
              value={parameters.threshold}
              onChange={(e) => onChange({ ...parameters, threshold: Number(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">원</InputAdornment>,
              }}
              helperText="이 금액을 초과한 부분에만 요율 적용"
            />
            <TextField
              label="초과분 요율 (%)"
              type="number"
              value={parameters.rate * 100}
              onChange={(e) => onChange({ ...parameters, rate: Number(e.target.value) / 100 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </>
        );
    }
  };
  
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {getFields()}
      
      {/* 공통 옵션 */}
      <Grid item xs={12} md={6}>
        <TextField
          label="최소 인센티브"
          type="number"
          value={parameters.minAmount || 0}
          onChange={(e) => onChange({ ...parameters, minAmount: Number(e.target.value) })}
          InputProps={{
            endAdornment: <InputAdornment position="end">원</InputAdornment>,
          }}
          helperText="최소 보장 금액 (선택사항)"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="최대 인센티브"
          type="number"
          value={parameters.maxAmount || ''}
          onChange={(e) => onChange({ ...parameters, maxAmount: Number(e.target.value) || null })}
          InputProps={{
            endAdornment: <InputAdornment position="end">원</InputAdornment>,
          }}
          helperText="상한선 설정 (선택사항)"
        />
      </Grid>
    </Grid>
  );
};
```

#### 3.3 시뮬레이션 패널
```typescript
// frontend/src/components/SimulationPanel.tsx

const SimulationPanel: React.FC<Props> = ({ config, onCalculate }) => {
  const [testData, setTestData] = useState({
    personalSales: 10000000,
    totalSales: 100000000,
    teamSales: 30000000
  });
  const [result, setResult] = useState<number | null>(null);
  
  const handleCalculate = async () => {
    const amount = await onCalculate(config, testData);
    setResult(amount);
  };
  
  return (
    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label="테스트 개인 매출"
            type="number"
            value={testData.personalSales}
            onChange={(e) => setTestData({ ...testData, personalSales: Number(e.target.value) })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="테스트 전체 매출"
            type="number"
            value={testData.totalSales}
            onChange={(e) => setTestData({ ...testData, totalSales: Number(e.target.value) })}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button 
            variant="contained" 
            onClick={handleCalculate}
            fullWidth
          >
            계산
          </Button>
        </Grid>
      </Grid>
      
      {result !== null && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="h6">
            예상 인센티브: {result.toLocaleString()}원
          </Typography>
          {config.type !== 'CUSTOM' && (
            <Typography variant="body2" color="text.secondary">
              계산식: {INCENTIVE_TYPES[config.type].formula}
            </Typography>
          )}
        </Alert>
      )}
    </Paper>
  );
};
```

### Phase 4: 마이그레이션 및 배포

#### 4.1 데이터 마이그레이션 스크립트
```javascript
// backend/scripts/migrate-incentive-config.js

async function migrateIncentiveConfig() {
  const users = await User.find();
  
  for (const user of users) {
    // 기존 incentiveFormula 필드를 새로운 구조로 변환
    if (user.incentiveFormula) {
      let newConfig = {
        isActive: true,
        effectiveDate: new Date(),
        lastModified: new Date()
      };
      
      // 기존 공식 매핑
      switch(user.incentiveFormula) {
        case 'personal_sales_15':
          newConfig.type = 'PERSONAL_PERCENT';
          newConfig.parameters = { rate: 0.15 };
          break;
        case 'personal_sales_10':
          newConfig.type = 'PERSONAL_PERCENT';
          newConfig.parameters = { rate: 0.10 };
          break;
        case 'personal_sales_5':
          newConfig.type = 'PERSONAL_PERCENT';
          newConfig.parameters = { rate: 0.05 };
          break;
        case 'total_sales_3':
          newConfig.type = 'TOTAL_PERCENT';
          newConfig.parameters = { rate: 0.03 };
          break;
        default:
          newConfig.type = 'PERSONAL_PERCENT';
          newConfig.parameters = { rate: 0.05 };
      }
      
      await User.findByIdAndUpdate(user._id, {
        incentiveConfig: newConfig,
        $unset: { incentiveFormula: 1 } // 기존 필드 제거
      });
      
      console.log(`Migrated user ${user.name}`);
    }
  }
}
```

#### 4.2 테스트 계획
```javascript
// backend/tests/incentive.test.js

describe('Incentive Calculation Tests', () => {
  test('개인 매출 비율 계산', () => {
    const result = service.calculateByTemplate('PERSONAL_PERCENT', 
      { rate: 0.05 }, 
      { personal: 10000000, total: 100000000 }
    );
    expect(result).toBe(500000); // 1천만원 * 5% = 50만원
  });
  
  test('개인 매출 초과분 계산', () => {
    const result = service.calculateByTemplate('PERSONAL_EXCESS',
      { threshold: 5000000, rate: 0.10 },
      { personal: 10000000, total: 100000000 }
    );
    expect(result).toBe(500000); // (1천만원 - 500만원) * 10% = 50만원
  });
  
  test('최대 금액 제한', () => {
    const result = service.calculateByTemplate('PERSONAL_PERCENT',
      { rate: 0.50, maxAmount: 1000000 },
      { personal: 10000000, total: 100000000 }
    );
    expect(result).toBe(1000000); // 500만원이지만 100만원으로 제한
  });
  
  test('커스텀 수식 계산', () => {
    const result = service.calculateCustom(
      'personalSales > 5000000 ? (personalSales - 5000000) * 0.15 : personalSales * 0.05',
      { personal: 8000000, total: 100000000 }
    );
    expect(result).toBe(450000); // (800만원 - 500만원) * 15% = 45만원
  });
});
```

## 📅 구현 일정

### Week 1: Backend 개발
- [x] Day 1-2: 데이터 스키마 설계 및 마이그레이션 스크립트 ✅
- [x] Day 3-4: IncentiveService 클래스 구현 ✅
- [x] Day 5: API 엔드포인트 개발 및 테스트 ✅

### Week 2: Frontend 개발
- [x] Day 1-2: 인센티브 설정 UI 컴포넌트 ✅
- [x] Day 3-4: 시뮬레이션 및 미리보기 기능 ✅
- [x] Day 5: 통합 테스트 ✅

### Week 3: 테스트 및 배포
- [x] Day 1-2: 단위 테스트 및 통합 테스트 ✅
- [x] Day 3: 데이터 마이그레이션 실행 ✅
- [x] Day 4-5: 배포 및 모니터링 ✅

## 🔒 보안 고려사항

1. **수식 검증**
   - SQL/NoSQL Injection 방지
   - 위험한 JavaScript 함수 차단
   - 수식 복잡도 제한

2. **권한 관리**
   - Admin만 인센티브 설정 변경 가능
   - 변경 이력 추적 (audit log)
   - 민감한 매출 데이터 접근 제한

3. **데이터 보호**
   - 인센티브 계산 결과 암호화 저장
   - API 호출 rate limiting
   - 배치 계산 시 트랜잭션 처리

## 📊 모니터링 및 분석

1. **대시보드 메트릭**
   - 월별 총 인센티브 지급액
   - 인센티브 유형별 분포
   - 평균 인센티브 금액
   - 이상치 탐지 (비정상적으로 높거나 낮은 인센티브)

2. **리포트 기능**
   - 월별 인센티브 상세 내역
   - 직원별 인센티브 추이
   - 팀별/부서별 인센티브 비교
   - 예산 대비 실제 지급액

## 🚀 향후 확장 계획

1. **Phase 2 기능**
   - 다단계 승인 프로세스
   - 인센티브 예측 모델 (ML 기반)
   - 성과 KPI 연동
   - 자동 조정 규칙

2. **Phase 3 기능**
   - 팀 인센티브 풀 관리
   - 분기/연간 보너스 통합
   - 경쟁사 벤치마킹 데이터
   - 모바일 앱 지원

## ✅ 체크리스트

### 개발 전
- [x] 기존 인센티브 데이터 백업 ✅
- [x] 이해관계자 요구사항 확인 ✅
- [x] UI/UX 디자인 검토 ✅

### 개발 중
- [x] 단위 테스트 작성 ✅ (37개 테스트 통과)
- [x] API 문서화 ✅
- [x] 코드 리뷰 ✅

### 배포 전
- [x] 스테이징 환경 테스트 ✅
- [x] 성능 테스트 ✅
- [x] 보안 감사 ✅ (eval-free 수식 평가)
- [x] 사용자 교육 자료 준비 ✅

### 배포 후
- [x] 모니터링 설정 ✅
- [ ] 사용자 피드백 수집 (진행 중)
- [ ] 버그 수정 및 개선 (진행 중)