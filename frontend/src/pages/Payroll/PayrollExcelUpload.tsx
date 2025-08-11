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

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: 'background.paper' }}>
      <Alert severity="info">
        급여 Excel 업로드 페이지 (단순 테스트)
      </Alert>
      <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
        <h2>사용자 정보</h2>
        <p>이름: {user?.name}</p>
        <p>역할: {user?.role}</p>
        <p>권한: {user?.permissions?.join(', ') || '없음'}</p>
      </Box>
    </Box>
  );
};

export default PayrollExcelUploadPage;