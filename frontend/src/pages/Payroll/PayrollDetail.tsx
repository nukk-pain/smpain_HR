/*
 * AI-HEADER
 * Intent: Payroll detail page wrapper with routing support
 * Domain Meaning: Page-level component for payroll record details
 * Misleading Names: None
 * Data Contracts: Expects payrollId from URL parameters
 * PII: Contains salary information - role-based access required
 * Invariants: Must validate payrollId parameter exists
 * RAG Keywords: payroll, detail, page, routing, parameters
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-detail-page-wrapper-routing-support
 */

import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { PayrollDetail } from '../../components/PayrollDetail';
import { Box, Alert } from '@mui/material';

export const PayrollDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Validate payroll ID parameter
  if (!id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          급여 기록 ID가 제공되지 않았습니다.
        </Alert>
      </Box>
    );
  }

  return <PayrollDetail payrollId={id} />;
};