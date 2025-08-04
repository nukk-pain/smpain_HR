/**
 * Incentive formula constants and calculation utilities
 * 
 * Provides centralized management of incentive formulas with type safety,
 * calculation logic, and localization support.
 */

// Immutable incentive formula constants
export const INCENTIVE_FORMULAS = {
  PERSONAL_SALES_15: 'personal_sales_15',
  PERSONAL_SALES_10: 'personal_sales_10',
  PERSONAL_SALES_5: 'personal_sales_5',
  TEAM_SALES_10: 'team_sales_10',
  TEAM_SALES_5: 'team_sales_5',
  TOTAL_SALES_3: 'total_sales_3',
  FIXED_BONUS: 'fixed_bonus',
  PERFORMANCE_BASED: 'performance_based',
  NONE: ''
} as const;

// Type-safe incentive formula type
export type IncentiveFormulaType = typeof INCENTIVE_FORMULAS[keyof typeof INCENTIVE_FORMULAS];

// Available formulas as array for iteration
export const INCENTIVE_FORMULA_VALUES = Object.values(INCENTIVE_FORMULAS);

/**
 * Type guard to check if a value is a valid IncentiveFormulaType
 */
export const isValidFormula = (formula: unknown): formula is IncentiveFormulaType => {
  return formula !== null && formula !== undefined && 
         INCENTIVE_FORMULA_VALUES.includes(formula as IncentiveFormulaType);
};

// Formula configuration with metadata
interface FormulaConfig {
  displayName: string;
  description: string;
  percentage?: number;
  calculationType: 'percentage' | 'fixed' | 'performance' | 'none';
}

const FORMULA_CONFIGS: Readonly<Record<IncentiveFormulaType, FormulaConfig>> = {
  [INCENTIVE_FORMULAS.PERSONAL_SALES_15]: {
    displayName: '개인 매출 15%',
    description: '개인 매출의 15%를 인센티브로 지급',
    percentage: 0.15,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.PERSONAL_SALES_10]: {
    displayName: '개인 매출 10%',
    description: '개인 매출의 10%를 인센티브로 지급',
    percentage: 0.10,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.PERSONAL_SALES_5]: {
    displayName: '개인 매출 5%',
    description: '개인 매출의 5%를 인센티브로 지급',
    percentage: 0.05,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.TEAM_SALES_10]: {
    displayName: '팀 매출 10%',
    description: '팀 매출의 10%를 인센티브로 지급',
    percentage: 0.10,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.TEAM_SALES_5]: {
    displayName: '팀 매출 5%',
    description: '팀 매출의 5%를 인센티브로 지급',
    percentage: 0.05,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.TOTAL_SALES_3]: {
    displayName: '전체 매출 3%',
    description: '전체 매출의 3%를 인센티브로 지급',
    percentage: 0.03,
    calculationType: 'percentage'
  },
  [INCENTIVE_FORMULAS.FIXED_BONUS]: {
    displayName: '고정 월 보너스',
    description: '고정 금액을 월 보너스로 지급',
    calculationType: 'fixed'
  },
  [INCENTIVE_FORMULAS.PERFORMANCE_BASED]: {
    displayName: '성과 기반',
    description: '성과에 따른 차등 인센티브 지급',
    calculationType: 'performance'
  },
  [INCENTIVE_FORMULAS.NONE]: {
    displayName: '인센티브 없음',
    description: '인센티브 없음',
    calculationType: 'none'
  }
} as const;

/**
 * Get localized display name for a formula
 */
export const getFormulaDisplayName = (formula: IncentiveFormulaType): string => {
  return FORMULA_CONFIGS[formula]?.displayName ?? '';
};

/**
 * Get detailed description for a formula
 */
export const getFormulaDescription = (formula: IncentiveFormulaType): string => {
  return FORMULA_CONFIGS[formula]?.description ?? '';
};

/**
 * Get formula configuration
 */
export const getFormulaConfig = (formula: IncentiveFormulaType): FormulaConfig | null => {
  return FORMULA_CONFIGS[formula] ?? null;
};

// Type-safe incentive calculation data
export interface IncentiveData {
  readonly personalSales?: number;
  readonly teamSales?: number;
  readonly totalSales?: number;
  readonly fixedAmount?: number;
  readonly performanceScore?: number;
}

// Formula calculation strategies
const CALCULATION_STRATEGIES = {
  personal_sales: (data: IncentiveData, percentage: number): number => 
    Math.floor((data.personalSales ?? 0) * percentage),
  
  team_sales: (data: IncentiveData, percentage: number): number => 
    Math.floor((data.teamSales ?? 0) * percentage),
  
  total_sales: (data: IncentiveData, percentage: number): number => 
    Math.floor((data.totalSales ?? 0) * percentage),
  
  fixed_bonus: (data: IncentiveData): number => 
    data.fixedAmount ?? 0,
  
  performance_based: (data: IncentiveData): number => 
    Math.floor((data.performanceScore ?? 0) * 10000) // 성과점수 * 10,000원
} as const;

/**
 * Calculate incentive amount based on formula and data
 */
export const calculateIncentive = (formula: IncentiveFormulaType, data: IncentiveData): number => {
  const config = FORMULA_CONFIGS[formula];
  if (!config) return 0;

  switch (formula) {
    case INCENTIVE_FORMULAS.PERSONAL_SALES_15:
    case INCENTIVE_FORMULAS.PERSONAL_SALES_10:
    case INCENTIVE_FORMULAS.PERSONAL_SALES_5:
      return CALCULATION_STRATEGIES.personal_sales(data, config.percentage!);
    
    case INCENTIVE_FORMULAS.TEAM_SALES_10:
    case INCENTIVE_FORMULAS.TEAM_SALES_5:
      return CALCULATION_STRATEGIES.team_sales(data, config.percentage!);
    
    case INCENTIVE_FORMULAS.TOTAL_SALES_3:
      return CALCULATION_STRATEGIES.total_sales(data, config.percentage!);
    
    case INCENTIVE_FORMULAS.FIXED_BONUS:
      return CALCULATION_STRATEGIES.fixed_bonus(data);
    
    case INCENTIVE_FORMULAS.PERFORMANCE_BASED:
      return CALCULATION_STRATEGIES.performance_based(data);
    
    case INCENTIVE_FORMULAS.NONE:
    default:
      return 0;
  }
};

/**
 * Get all available formulas with their display names
 */
export const getAvailableFormulas = (): Array<{ value: IncentiveFormulaType; label: string }> => {
  return INCENTIVE_FORMULA_VALUES.map(formula => ({
    value: formula,
    label: getFormulaDisplayName(formula)
  }));
};