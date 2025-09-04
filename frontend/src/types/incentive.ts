/**
 * AI-HEADER
 * @intent: Type definitions for incentive calculation system
 * @domain_meaning: TypeScript types for commission configuration and calculation
 * @misleading_names: None
 * @data_contracts: Defines structure for incentive config, parameters, and results
 * @pii: No PII in type definitions
 * @invariants: Type must be valid, rate must be 0-1, amounts must be non-negative
 * @rag_keywords: incentive types, commission types, typescript definitions
 */

export type IncentiveType = 
  | 'PERSONAL_PERCENT'
  | 'TOTAL_PERCENT'
  | 'PERSONAL_EXCESS'
  | 'TOTAL_EXCESS'
  | 'CUSTOM';

export interface IncentiveParameters {
  rate?: number;          // Commission rate (0-1)
  threshold?: number;     // Threshold amount for excess calculations
  minAmount?: number;     // Minimum incentive amount
  maxAmount?: number;     // Maximum incentive amount (cap)
}

export interface IncentiveConfig {
  type: IncentiveType;
  parameters: IncentiveParameters;
  customFormula?: string;
  isActive: boolean;
  effectiveDate: Date | string;
  lastModified?: Date | string;
  modifiedBy?: string;
}

export interface IncentiveTypeInfo {
  value: IncentiveType;
  name: string;
  description: string;
  requiredParams: string[];
}

export interface SalesData {
  personal?: number;
  total?: number;
  team?: number;
}

export interface IncentiveCalculationResult {
  amount: number;
  type: IncentiveType;
  details: {
    formula?: string;
    parameters?: IncentiveParameters;
    salesData?: SalesData;
    typeName?: string;
    reason?: string;
  };
  calculatedAt: Date | string;
}

export interface IncentiveSimulationRequest {
  config: IncentiveConfig;
  salesData: SalesData;
}

export interface IncentiveSimulationResult {
  amount: number;
  salesData: SalesData;
  config: {
    type: IncentiveType;
    parameters: IncentiveParameters;
  };
}

export interface IncentiveHistoryItem {
  yearMonth: string;
  amount: number;
  calculatedAt?: Date | string;
}

export interface BatchCalculationResult {
  results: Array<{
    userId: string;
    name: string;
    department: string;
    amount: number;
    type: IncentiveType;
    details: any;
  }>;
  errors: Array<{
    userId: string;
    name: string;
    error: string;
  }>;
  summary: {
    processed: number;
    failed: number;
    totalAmount: number;
  };
}

export interface IncentiveValidationResult {
  success: boolean;
  isValid: boolean;
  errors?: string[];
  testResult?: number;
}

// Helper type guards
export const isValidIncentiveType = (type: string): type is IncentiveType => {
  return ['PERSONAL_PERCENT', 'TOTAL_PERCENT', 'PERSONAL_EXCESS', 'TOTAL_EXCESS', 'CUSTOM'].includes(type);
};

// Default configurations
export const DEFAULT_INCENTIVE_CONFIG: IncentiveConfig = {
  type: 'PERSONAL_PERCENT',
  parameters: {
    rate: 0.05,
    minAmount: 0,
    maxAmount: undefined
  },
  customFormula: undefined,
  isActive: false,
  effectiveDate: new Date()
};

// UI Labels
export const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  PERSONAL_PERCENT: '개인 매출 비율',
  TOTAL_PERCENT: '전체 매출 비율',
  PERSONAL_EXCESS: '개인 매출 초과분',
  TOTAL_EXCESS: '전체 매출 초과분',
  CUSTOM: '커스텀 수식'
};

export const INCENTIVE_TYPE_DESCRIPTIONS: Record<IncentiveType, string> = {
  PERSONAL_PERCENT: '개인 매출의 일정 비율을 인센티브로 지급',
  TOTAL_PERCENT: '전체 매출의 일정 비율을 인센티브로 지급',
  PERSONAL_EXCESS: '개인 매출 중 기준 금액을 초과한 부분의 일정 비율을 지급',
  TOTAL_EXCESS: '전체 매출 중 기준 금액을 초과한 부분의 일정 비율을 지급',
  CUSTOM: '사용자 정의 수식으로 인센티브 계산'
};