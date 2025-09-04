/*
 * AI-HEADER
 * Intent: Utility functions for parsing payslip PDF file names
 * Domain Meaning: Extracts metadata from standardized payslip file naming convention
 * Misleading Names: None
 * Data Contracts: Returns parsed data matching PayslipFile['parsedData'] type
 * PII: Processes employee names from file names
 * Invariants: File name must follow expected pattern for successful parsing
 * RAG Keywords: payslip, parse, filename, regex, PDF, extract
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-filename-parser-utilities
 */

import { PayslipFile } from '../types/PayslipUploadTypes';

/**
 * Parse payslip filename to extract metadata
 * Expected formats:
 * - "[Company] 급여명세서_[YYYY-MM]_[Employee Name].pdf"
 * - "급여명세서_[YYYY-MM]_[Employee Name].pdf"
 * - "[Employment Type]_급여명세서_[YYYY-MM]_[Employee Name].pdf"
 */
export const parsePayslipFileName = (fileName: string): PayslipFile['parsedData'] => {
  const parsedData: PayslipFile['parsedData'] = {};

  // Remove .pdf extension
  const nameWithoutExt = fileName.replace(/\.pdf$/i, '');

  // Pattern 1: [Company] 급여명세서_[YYYY-MM]_[Employee Name]
  const pattern1 = /^\[([^\]]+)\]\s*급여명세서_(\d{4}-\d{2})_(.+)$/;
  
  // Pattern 2: 급여명세서_[YYYY-MM]_[Employee Name]
  const pattern2 = /^급여명세서_(\d{4}-\d{2})_(.+)$/;
  
  // Pattern 3: [Employment Type]_급여명세서_[YYYY-MM]_[Employee Name]
  const pattern3 = /^([^_]+)_급여명세서_(\d{4}-\d{2})_(.+)$/;
  
  // Pattern 4: Flexible pattern for variations
  const flexiblePattern = /(\d{4}-\d{2})/;

  // Try Pattern 1
  let matches = nameWithoutExt.match(pattern1);
  if (matches) {
    parsedData.company = matches[1];
    parsedData.yearMonth = matches[2];
    parsedData.employeeName = matches[3].trim();
    return parsedData;
  }

  // Try Pattern 2
  matches = nameWithoutExt.match(pattern2);
  if (matches) {
    parsedData.yearMonth = matches[1];
    parsedData.employeeName = matches[2].trim();
    return parsedData;
  }

  // Try Pattern 3
  matches = nameWithoutExt.match(pattern3);
  if (matches) {
    parsedData.employmentType = matches[1];
    parsedData.yearMonth = matches[2];
    parsedData.employeeName = matches[3].trim();
    return parsedData;
  }

  // Fallback: Try to extract at least year-month
  const yearMonthMatch = nameWithoutExt.match(flexiblePattern);
  if (yearMonthMatch) {
    parsedData.yearMonth = yearMonthMatch[1];
    
    // Try to extract name after year-month
    const parts = nameWithoutExt.split(yearMonthMatch[1]);
    if (parts.length > 1) {
      const namePart = parts[1].replace(/^[_\s-]+|[_\s-]+$/g, '');
      if (namePart) {
        parsedData.employeeName = namePart;
      }
    }
  }

  // Last resort: try to find any name-like string
  if (!parsedData.employeeName) {
    const parts = nameWithoutExt.split(/[_-]/);
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart && !lastPart.match(/^\d+$/)) {
      parsedData.employeeName = lastPart;
    }
  }

  return parsedData;
};

/**
 * Validate if a file is a valid payslip PDF
 */
export const validatePayslipFile = (file: File): string | null => {
  // Check file type
  if (file.type !== 'application/pdf') {
    return 'PDF 파일만 업로드 가능합니다.';
  }

  // Check file size (max 5MB per file)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return '파일 크기는 5MB를 초과할 수 없습니다.';
  }

  // Check filename contains required keywords
  if (!file.name.includes('급여명세서') && !file.name.toLowerCase().includes('payslip')) {
    return '급여명세서 파일만 업로드 가능합니다.';
  }

  return null;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get status color based on match status
 */
export const getStatusColor = (status: PayslipFile['matchStatus']): string => {
  switch (status) {
    case 'matched':
      return 'success';
    case 'failed':
      return 'error';
    case 'manual':
      return 'warning';
    case 'pending':
    default:
      return 'default';
  }
};

/**
 * Get status icon based on match status
 */
export const getStatusIcon = (status: PayslipFile['matchStatus']) => {
  switch (status) {
    case 'matched':
      return 'CheckCircle';
    case 'failed':
      return 'Error';
    case 'manual':
      return 'Warning';
    case 'pending':
    default:
      return 'Info';
  }
};