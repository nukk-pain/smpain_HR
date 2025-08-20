/*
 * AI-HEADER
 * Intent: Payroll detail component with view and edit modes
 * Domain Meaning: Display and edit individual payroll records
 * Misleading Names: None
 * Data Contracts: Expects payroll record with nested allowances/deductions objects
 * PII: Contains salary information - role-based access control required
 * Invariants: Users can only view; Admin can view and edit
 * RAG Keywords: payroll, detail, edit, form, allowances, deductions
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-detail-component-view-edit-salary-data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface PayrollRecord {
  _id: string;
  year: number;
  month: number;
  user: {
    name: string;
    department: string;
  };
  baseSalary: number;
  allowances: {
    overtime: number;
    position: number;
    meal: number;
    transportation: number;
    other: number;
  };
  deductions: {
    nationalPension: number;
    healthInsurance: number;
    employmentInsurance: number;
    incomeTax: number;
    localIncomeTax: number;
    other: number;
  };
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
}

interface PayrollDetailProps {
  payrollId: string;
}

export const PayrollDetail: React.FC<PayrollDetailProps> = ({ payrollId }) => {
  const { user } = useAuth();
  const [payrollData, setPayrollData] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data for edit mode
  const [formData, setFormData] = useState<Partial<PayrollRecord>>({});

  // Check if user can edit
  const canEdit = user?.permissions?.includes('payroll:manage') || user?.role === 'admin';

  // Fetch payroll data
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPayrollRecord(payrollId);
      if (response.success) {
        setPayrollData(response.data as PayrollRecord);
        setFormData(response.data as PayrollRecord);
      } else {
        setError(response.error || '급여 정보를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '급여 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [payrollId]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any, section?: string) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof PayrollRecord] as any || {}),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.updatePayrollRecord(payrollId, formData);
      if (response.success) {
        setPayrollData({ ...payrollData!, ...formData } as PayrollRecord);
        setEditMode(false);
      } else {
        setError(response.error || '저장에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setFormData(payrollData || {});
    setEditMode(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount?.toLocaleString() || '0';
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      pending: { label: '대기', color: 'warning' as const },
      approved: { label: '승인', color: 'info' as const },
      paid: { label: '지급완료', color: 'success' as const },
      cancelled: { label: '취소', color: 'error' as const }
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'default' as const };
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          급여 정보를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!payrollData) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="info">급여 정보를 찾을 수 없습니다.</Alert>
      </Box>
    );
  }

  const statusInfo = getStatusDisplay(payrollData.paymentStatus);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1">
            급여 상세 정보
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {payrollData.year}년 {payrollData.month}월 - {payrollData.user?.name}
          </Typography>
        </Box>
        {canEdit && !editMode && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditMode(true)}
          >
            수정
          </Button>
        )}
        {editMode && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              저장
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              취소
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    사원명
                  </Typography>
                  <Typography variant="body1">
                    {payrollData.user?.name}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    부서
                  </Typography>
                  <Typography variant="body1">
                    {payrollData.user?.department}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    년도
                  </Typography>
                  <Typography variant="body1">
                    {payrollData.year}년
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">
                    월
                  </Typography>
                  <Typography variant="body1">
                    {payrollData.month}월
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    상태
                  </Typography>
                  <Chip
                    label={statusInfo.label}
                    color={statusInfo.color}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Salary Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                급여 정보
              </Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  {editMode ? (
                    <TextField
                      fullWidth
                      label="기본급"
                      type="number"
                      value={formData.baseSalary || ''}
                      onChange={(e) => handleFieldChange('baseSalary', parseInt(e.target.value) || 0)}
                    />
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        기본급
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(payrollData.baseSalary)}원
                      </Typography>
                    </>
                  )}
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    총 수당
                  </Typography>
                  <Typography variant="body1" color="primary">
                    총 수당: {formatCurrency(payrollData.totalAllowances)}원
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    총 공제
                  </Typography>
                  <Typography variant="body1" color="error">
                    총 공제: {formatCurrency(payrollData.totalDeductions)}원
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Divider />
                  <Typography variant="h6" color="success.main" sx={{ mt: 1 }}>
                    실수령액: {formatCurrency(payrollData.netSalary)}원
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Allowances */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                수당 내역
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목</TableCell>
                      <TableCell align="right">금액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { key: 'overtime', label: '시간외수당' },
                      { key: 'position', label: '직책수당' },
                      { key: 'meal', label: '식대' },
                      { key: 'transportation', label: '교통비' },
                      { key: 'other', label: '기타수당' }
                    ].map(({ key, label }) => (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">
                          {editMode ? (
                            <TextField
                              size="small"
                              type="number"
                              value={formData.allowances?.[key as keyof typeof formData.allowances] || ''}
                              onChange={(e) => handleFieldChange(key, parseInt(e.target.value) || 0, 'allowances')}
                              inputProps={{ min: 0, style: { textAlign: 'right' } }}
                            />
                          ) : (
                            `${formatCurrency(payrollData.allowances[key as keyof typeof payrollData.allowances])}원`
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Deductions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                공제 내역
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목</TableCell>
                      <TableCell align="right">금액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { key: 'nationalPension', label: '국민연금' },
                      { key: 'healthInsurance', label: '건강보험' },
                      { key: 'employmentInsurance', label: '고용보험' },
                      { key: 'incomeTax', label: '소득세' },
                      { key: 'localIncomeTax', label: '지방소득세' },
                      { key: 'other', label: '기타공제' }
                    ].map(({ key, label }) => (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell align="right">
                          {editMode ? (
                            <TextField
                              size="small"
                              type="number"
                              value={formData.deductions?.[key as keyof typeof formData.deductions] || ''}
                              onChange={(e) => handleFieldChange(key, parseInt(e.target.value) || 0, 'deductions')}
                              inputProps={{ min: 0, style: { textAlign: 'right' } }}
                            />
                          ) : (
                            `${formatCurrency(payrollData.deductions[key as keyof typeof payrollData.deductions])}원`
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};