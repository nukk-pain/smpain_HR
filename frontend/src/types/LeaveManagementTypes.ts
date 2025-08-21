/*
 * AI-HEADER
 * Intent: Type definitions for leave management functionality
 * Domain Meaning: Types for leave requests, balances, and management operations
 * Misleading Names: None
 * Data Contracts: Defines interfaces for leave-related data structures
 * PII: Contains employee information and leave details
 * Invariants: Leave dates must be valid, balance cannot be negative beyond allowed limit
 * RAG Keywords: leave, vacation, management, types, request, balance
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-management-type-definitions
 */

export interface LeaveDialogProps {
  open: boolean;
  editingRequest: LeaveRequest | null;
  formData: LeaveForm;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: LeaveForm) => void;
}

export interface LeaveCancellationDialogProps {
  open: boolean;
  request: LeaveRequest | null;
  reason: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReasonChange: (reason: string) => void;
}

export interface LeaveStatisticsCardProps {
  leaveBalance: LeaveBalance | null;
  leaveRequests: LeaveRequest[];
  selectedYear: number;
}

export interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  loading: boolean;
  currentUserId: string;
  onEdit: (request: LeaveRequest) => void;
  onDelete: (id: string) => void;
  onCancel: (request: LeaveRequest) => void;
}

export interface LeaveForm {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  substituteEmployee: string;
  personalOffDays: string[];
}

export interface LeaveRequest {
  _id: string;
  user: {
    _id: string;
    name: string;
    department: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  substituteEmployee?: string;
  personalOffDays?: string[];
  status: string;
  appliedAt: string;
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  cancelRequested?: boolean;
  cancelReason?: string;
  cancelRequestedAt?: string;
  cancelApprovedBy?: {
    _id: string;
    name: string;
  };
  cancelApprovedAt?: string;
}

export interface LeaveBalance {
  userId: string;
  year: number;
  annual: number;
  sick: number;
  used: {
    annual: number;
    sick: number;
    personal: number;
    other: number;
  };
  remaining: {
    annual: number;
    sick: number;
  };
  carryOver: number;
}