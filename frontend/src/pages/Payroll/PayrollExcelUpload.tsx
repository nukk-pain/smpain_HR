/*
 * AI-HEADER
 * Intent: Payroll Excel upload page wrapper
 * Domain Meaning: Page-level component for bulk payroll data import
 * Misleading Names: None
 * Data Contracts: Handles Excel file upload flow and navigation
 * PII: Contains salary information - Admin-only access required
 * Invariants: Must enforce admin permissions for upload functionality
 * RAG Keywords: payroll, excel, upload, page, admin, bulk-import
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-excel-upload-page-wrapper-admin-access
 */

import React from 'react';
import { Box, Alert } from '@mui/material';
import { PayrollExcelUpload } from '../../components/PayrollExcelUpload';
import { useAuth } from '../../hooks/useAuth';

export const PayrollExcelUploadPage: React.FC = () => {
  const { user } = useAuth();

  // Check if user has permission to upload payroll data
  const canUpload = user?.permissions?.includes('payroll:manage') || user?.role === 'Admin';

  if (!canUpload) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          급여 데이터 업로드 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      </Box>
    );
  }

  return <PayrollExcelUpload />;
};