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
import { PayrollExcelUploadWithPreview } from '../../components/PayrollExcelUploadWithPreview';
import { useAuth } from '../../components/AuthProvider';

export const PayrollExcelUploadPage: React.FC = () => {
  const { user } = useAuth();

  // Check if user has permission to upload payroll data
  const canUpload = user?.permissions?.includes('payroll:manage') || user?.role === 'admin';

  if (!canUpload) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          급여 데이터 업로드 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      </Box>
    );
  }

  try {
    return <PayrollExcelUploadWithPreview />;
  } catch (error) {
    console.error('PayrollExcelUploadWithPreview component error:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          컴포넌트 로드 중 오류가 발생했습니다: {String(error)}
        </Alert>
      </Box>
    );
  }
};

export default PayrollExcelUploadPage;