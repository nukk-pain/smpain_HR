/*
 * AI-HEADER
 * Intent: Type definitions for payslip bulk upload functionality
 * Domain Meaning: Types for PDF payslip file processing and employee matching
 * Misleading Names: None
 * Data Contracts: Defines interfaces for payslip files and upload history
 * PII: Contains employee name and ID references
 * Invariants: Match status must progress through defined states
 * RAG Keywords: payslip, upload, types, PDF, matching, bulk
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-upload-type-definitions
 */

export interface PayslipFile {
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

export interface MatchingDialogProps {
  open: boolean;
  file: PayslipFile | null;
  availableUsers: Array<{
    id: string;
    name: string;
    employeeId: string;
    department: string;
  }>;
  onClose: () => void;
  onConfirm: (userId: string) => void;
}

export interface UploadHistory {
  _id: string;
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
  };
  totalFiles: number;
  successCount: number;
  failedCount: number;
  payslips: Array<{
    fileName: string;
    employeeId: string;
    employeeName: string;
    yearMonth: string;
    uploadStatus: 'success' | 'failed';
    error?: string;
  }>;
}

export interface EmployeeUser {
  id: string;
  name: string;
  employeeId: string;
  department: string;
}

export interface MatchResult {
  fileName: string;
  matched: boolean;
  userId?: string;
  userName?: string;
  employeeId?: string;
  confidence?: number;
  reason?: string;
}