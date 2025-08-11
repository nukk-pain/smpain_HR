/*
 * AI-HEADER
 * Intent: Type definitions for payroll Excel upload preview functionality
 * Domain Meaning: Defines data structures for two-phase upload process with preview
 * Misleading Names: None
 * Data Contracts: Matches backend API response structure for preview/confirm endpoints
 * PII: Contains employee and salary information types
 * Invariants: Preview token must be valid for confirmation phase
 * RAG Keywords: payroll, upload, preview, types, excel, validation
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-upload-types-definitions
 */

// Upload process state management
export type UploadStep = 'select' | 'preview' | 'confirmed' | 'completed';

export interface UploadState {
  step: UploadStep;
  selectedFile: File | null;
  previewData: PreviewData | null;
  previewToken: string | null;
  expiresIn: number | null; // seconds
  uploading: boolean;
  confirming: boolean;
  result: UploadResult | null;
  error: string | null;
}

// Preview data structures
export interface PreviewData {
  summary: PreviewSummary;
  records: PreviewRecord[];
  errors: PreviewError[];
  warnings: PreviewWarning[];
}

export interface PreviewSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  fileName: string;
  fileSize: number;
  year: number;
  month: number;
}

export interface PreviewRecord {
  rowIndex: number;
  employeeName: string;
  employeeId?: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  matchedUser: MatchedUser;
  status: RecordStatus;
}

export interface MatchedUser {
  found: boolean;
  userId?: string;
  name?: string;
  employeeId?: string;
}

export type RecordStatus = 'valid' | 'invalid' | 'warning';

export interface PreviewError {
  row: number;
  message: string;
}

export interface PreviewWarning {
  row: number;
  message: string;
}

// Upload result structures
export interface UploadResult {
  success: boolean;
  message: string;
  totalRecords: number;
  successfulImports: number;
  errors?: ImportError[];
  summary: UploadSummary;
}

export interface ImportError {
  record: string;
  error: string;
}

export interface UploadSummary {
  fileName: string;
  processedAt: Date;
  year: number;
  month: number;
}

// API Response types
export interface PreviewApiResponse {
  success: boolean;
  previewToken?: string;
  expiresIn?: number;
  summary?: PreviewSummary;
  records?: PreviewRecord[];
  errors?: PreviewError[];
  warnings?: PreviewWarning[];
  error?: string;
}

export interface ConfirmApiResponse {
  success: boolean;
  message?: string;
  totalRecords?: number;
  successfulImports?: number;
  errors?: ImportError[];
  summary?: UploadSummary;
  error?: string;
}

// Session storage structure for state persistence
export interface StoredUploadState {
  step: UploadStep;
  previewToken: string | null;
  previewData: PreviewData | null;
  fileName: string | null;
  timestamp: number;
}