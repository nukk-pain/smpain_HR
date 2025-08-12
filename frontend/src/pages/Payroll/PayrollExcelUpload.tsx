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

  console.log('🎯 PayrollExcelUploadPage rendering, user:', user?.name, 'role:', user?.role, 'permissions:', user?.permissions);

  // Check if user has permission to upload payroll data
  const canUpload = user?.permissions?.includes('payroll:manage') || user?.role === 'admin';
  
  console.log('🎯 canUpload check:', canUpload, 'hasPayrollManage:', user?.permissions?.includes('payroll:manage'), 'isAdmin:', user?.role === 'admin');

  if (!canUpload) {
    console.log('🎯 Access denied, showing error');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          급여 데이터 업로드 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      </Box>
    );
  }

  console.log('🎯 Access granted, rendering PayrollExcelUploadWithPreview');
  
  // Render the actual PayrollExcelUploadWithPreview component
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PayrollExcelUploadWithPreview />
    </Box>
  );
};

export default PayrollExcelUploadPage;