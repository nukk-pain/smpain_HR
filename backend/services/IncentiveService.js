/**
 * AI-HEADER
 * @intent: Calculate employee incentives using template-based and custom formulas
 * @domain_meaning: IncentiveService manages commission calculations based on sales performance
 * @misleading_names: None
 * @data_contracts: Expects salesData with personal/total/team fields, returns amount in KRW
 * @pii: No PII stored, only references userId
 * @invariants: Amount must be >= 0, rate must be between 0-1, threshold must be >= 0
 * @rag_keywords: incentive, commission, sales, calculation, template, formula
 */

const IncentiveCalculator = require('../incentiveCalculator');

/**
 * Incentive type definitions with metadata
 * @DomainMeaning: Defines available incentive calculation templates
 * @Invariants: Each type must have unique key and valid formula
 */
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

/**
 * Service class for incentive calculations
 * @DomainMeaning: Core business logic for employee commission calculations
 * @MisleadingNames: None
 * @SideEffects: None - pure calculation functions
 * @Invariants: All calculation results must be non-negative integers
 * @RAG_Keywords: incentive service, commission calculator, template calculation
 * @DuplicatePolicy: canonical
 * @FunctionIdentity: hash_incentive_service_v1
 */
class IncentiveService {
  constructor() {
    this.calculator = new IncentiveCalculator();
  }

  /**
   * Calculate incentive using predefined templates
   * @DomainMeaning: Apply template-based formulas for standard incentive types
   * @Invariants: Result must be >= 0, parameters must contain required fields
   * @RAG_Keywords: template calculation, commission formula
   */
  calculateByTemplate(type, parameters, salesData) {
    if (!INCENTIVE_TYPES[type] || type === 'CUSTOM') {
      throw new Error(`Invalid template type: ${type}`);
    }

    // Validate required parameters
    const requiredParams = INCENTIVE_TYPES[type].requiredParams;
    for (const param of requiredParams) {
      if (parameters[param] === undefined || parameters[param] === null) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    // Log for debugging
    console.log(`Calculating incentive for type: ${type}`, {
      parameters,
      salesData
    });

    let amount = 0;

    switch(type) {
      case 'PERSONAL_PERCENT':
        amount = (salesData.personal || 0) * parameters.rate;
        break;
      
      case 'TOTAL_PERCENT':
        amount = (salesData.total || 0) * parameters.rate;
        break;
      
      case 'PERSONAL_EXCESS':
        const personalExcess = Math.max(0, (salesData.personal || 0) - parameters.threshold);
        amount = personalExcess * parameters.rate;
        break;
      
      case 'TOTAL_EXCESS':
        const totalExcess = Math.max(0, (salesData.total || 0) - parameters.threshold);
        amount = totalExcess * parameters.rate;
        break;
      
      default:
        amount = 0;
    }

    return this.applyLimits(amount, parameters);
  }

  /**
   * Apply minimum and maximum limits to calculated amount
   * @DomainMeaning: Enforce business rules for incentive boundaries
   * @Invariants: Result must be between minAmount and maxAmount if specified
   */
  applyLimits(amount, parameters) {
    // Ensure non-negative
    amount = Math.max(0, amount);

    // Apply minimum amount
    if (parameters.minAmount !== undefined && parameters.minAmount !== null) {
      amount = Math.max(amount, parameters.minAmount);
    }

    // Apply maximum amount (cap)
    if (parameters.maxAmount !== undefined && parameters.maxAmount !== null) {
      amount = Math.min(amount, parameters.maxAmount);
    }

    // Return as integer (remove decimals)
    return Math.floor(amount);
  }

  /**
   * Calculate using custom formula
   * @DomainMeaning: Execute user-defined formulas with safety validation
   * @SideEffects: None
   * @Invariants: Formula must pass validation before execution
   */
  calculateCustom(formula, salesData) {
    if (!formula || typeof formula !== 'string') {
      throw new Error('Invalid custom formula');
    }

    // Prepare variables for the formula - note IncentiveCalculator expects different names
    const variables = {
      personalSales: salesData.personal || 0,
      totalSales: salesData.total || 0,
      teamSales: salesData.team || 0,
      // IncentiveCalculator uses these variable names
      sales: salesData.personal || 0,
      baseSalary: salesData.baseSalary || 0,
      years: salesData.years || 0,
      performance: salesData.performance || 0
    };

    try {
      const result = this.calculator.calculate(formula, variables);
      return Math.max(0, Math.floor(result));
    } catch (error) {
      console.error('Custom formula calculation error:', error);
      throw new Error(`Formula calculation failed: ${error.message}`);
    }
  }

  /**
   * Main calculation function for a user
   * @DomainMeaning: Calculate incentive for specific user and period
   * @SideEffects: Reads from database (users, salesData collections)
   * @Invariants: Returns valid calculation result or throws error
   */
  async calculateIncentive(userId, yearMonth, db) {
    // Get user configuration
    const user = await db.collection('users').findOne({ 
      _id: userId,
      isActive: true 
    });

    if (!user) {
      throw new Error('User not found or inactive');
    }

    // Check if incentive is configured and active
    if (!user.incentiveConfig || !user.incentiveConfig.isActive) {
      return {
        amount: 0,
        type: 'NONE',
        details: { reason: 'No active incentive configuration' },
        calculatedAt: new Date()
      };
    }

    // Get sales data for the period
    const salesData = await this.getSalesData(userId, yearMonth, db);

    const config = user.incentiveConfig;
    let amount = 0;
    let details = {};

    try {
      if (config.type === 'CUSTOM' && config.customFormula) {
        amount = this.calculateCustom(config.customFormula, salesData);
        details = {
          formula: config.customFormula,
          salesData: salesData
        };
      } else if (config.type && config.type !== 'CUSTOM') {
        amount = this.calculateByTemplate(config.type, config.parameters, salesData);
        details = {
          type: config.type,
          typeName: INCENTIVE_TYPES[config.type].name,
          parameters: config.parameters,
          salesData: salesData
        };
      } else {
        throw new Error('Invalid incentive configuration');
      }

      // Round up to nearest thousand won
      const roundedAmount = Math.ceil(amount / 1000) * 1000;

      return {
        amount: roundedAmount,
        type: config.type,
        details,
        calculatedAt: new Date()
      };
    } catch (error) {
      console.error(`Incentive calculation error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get sales data for calculation
   * @DomainMeaning: Retrieve sales performance data for incentive calculation
   * @SideEffects: Database read from salesData and companySales collections
   */
  async getSalesData(userId, yearMonth, db) {
    // Try to get from salesData collection
    const salesRecord = await db.collection('salesData').findOne({
      userId: userId,
      yearMonth: yearMonth
    });

    // Get company total sales for TOTAL_PERCENT and TOTAL_EXCESS calculations
    const companySales = await db.collection('companySales').findOne({
      yearMonth: yearMonth
    });

    if (salesRecord) {
      return {
        personal: salesRecord.individualSales || salesRecord.personalSales || salesRecord.salesAmount || 0,
        total: companySales ? companySales.totalAmount : 0,
        team: salesRecord.teamSales || 0
      };
    }

    // Return zero sales if no data found
    return {
      personal: 0,
      total: companySales ? companySales.totalAmount : 0,
      team: 0
    };
  }

  /**
   * Simulate incentive calculation without saving
   * @DomainMeaning: Test incentive calculations with hypothetical data
   * @SideEffects: None - pure calculation
   */
  async simulate(config, testSalesData) {
    if (!config || !config.type) {
      throw new Error('Invalid configuration for simulation');
    }

    try {
      let amount;
      if (config.type === 'CUSTOM' && config.customFormula) {
        amount = this.calculateCustom(config.customFormula, testSalesData);
      } else {
        amount = this.calculateByTemplate(config.type, config.parameters || {}, testSalesData);
      }
      // Round up to nearest thousand won
      return Math.ceil(amount / 1000) * 1000;
    } catch (error) {
      console.error('Simulation error:', error);
      throw error;
    }
  }

  /**
   * Validate incentive configuration
   * @DomainMeaning: Ensure configuration meets business rules
   * @Invariants: Valid type, required parameters present, rates between 0-1
   */
  validateConfig(config) {
    const errors = [];

    // Check type
    if (!config.type || !INCENTIVE_TYPES[config.type]) {
      errors.push('Invalid incentive type');
    }

    // Check parameters for non-custom types
    if (config.type && config.type !== 'CUSTOM') {
      // Check if type exists in INCENTIVE_TYPES
      if (!INCENTIVE_TYPES[config.type]) {
        // Already caught above, skip parameter validation
        return { isValid: false, errors };
      }
      
      const requiredParams = INCENTIVE_TYPES[config.type].requiredParams;
      
      for (const param of requiredParams) {
        if (config.parameters[param] === undefined) {
          errors.push(`Missing required parameter: ${param}`);
        }
      }

      // Validate rate range
      if (config.parameters.rate !== undefined) {
        if (config.parameters.rate < 0 || config.parameters.rate > 1) {
          errors.push('Rate must be between 0 and 1');
        }
      }

      // Validate threshold
      if (config.parameters.threshold !== undefined) {
        if (config.parameters.threshold < 0) {
          errors.push('Threshold must be non-negative');
        }
      }

      // Validate limits
      if (config.parameters.minAmount !== undefined && config.parameters.minAmount < 0) {
        errors.push('Minimum amount must be non-negative');
      }

      if (config.parameters.maxAmount !== undefined && config.parameters.maxAmount < 0) {
        errors.push('Maximum amount must be non-negative');
      }

      if (config.parameters.minAmount && config.parameters.maxAmount) {
        if (config.parameters.minAmount > config.parameters.maxAmount) {
          errors.push('Minimum amount cannot exceed maximum amount');
        }
      }
    }

    // Check custom formula
    if (config.type === 'CUSTOM') {
      if (!config.customFormula) {
        errors.push('Custom formula is required for CUSTOM type');
      } else {
        // Validate formula syntax
        const validation = this.calculator.validateFormula(config.customFormula);
        if (!validation.isValid) {
          errors.push(`Formula validation error: ${validation.error}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default configuration for new users
   * @DomainMeaning: Provide standard incentive setup for new employees
   */
  getDefaultConfig() {
    return {
      type: 'PERSONAL_PERCENT',
      parameters: {
        rate: 0.05,
        minAmount: 0,
        maxAmount: null
      },
      customFormula: null,
      isActive: false,
      effectiveDate: new Date(),
      lastModified: new Date()
    };
  }

  /**
   * Get available incentive types
   * @DomainMeaning: List all supported incentive calculation methods
   */
  getAvailableTypes() {
    return Object.keys(INCENTIVE_TYPES).map(key => ({
      value: key,
      name: INCENTIVE_TYPES[key].name,
      description: INCENTIVE_TYPES[key].description,
      requiredParams: INCENTIVE_TYPES[key].requiredParams
    }));
  }
}

module.exports = IncentiveService;