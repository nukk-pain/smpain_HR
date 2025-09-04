/*
 * AI-HEADER
 * Intent: Payslip management page wrapper
 * Domain Meaning: Page-level component for PDF payslip document management
 * Misleading Names: None
 * Data Contracts: Handles payslip management with role-based access
 * PII: Contains salary information - appropriate access control required
 * Invariants: Must respect user permissions for viewing/managing payslips
 * RAG Keywords: payslip, management, page, pdf, documents, access-control
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-management-page-wrapper-access-control
 */

import React from 'react';
import { PayslipManagement } from '../../components/PayslipManagement';

export const PayslipManagementPage: React.FC = () => {
  return <PayslipManagement />;
};