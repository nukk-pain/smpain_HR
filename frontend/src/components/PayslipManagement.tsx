/*
 * AI-HEADER
 * Intent: Payslip management component with PDF upload, view, and delete operations
 * Domain Meaning: Administrative interface for PDF payslip document management
 * Misleading Names: None
 * Data Contracts: Expects payroll records with PDF document capabilities
 * PII: Contains salary information - role-based access control required
 * Invariants: Admin can upload/delete; Users can only view/download their own
 * RAG Keywords: payslip, pdf, management, upload, view, delete, documents
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-management-component-pdf-document-operations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
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
  netSalary: number;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
  hasPayslip?: boolean;
}

export const PayslipManagement: React.FC = () => {
  const { user } = useAuth();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check permissions
  const canManage = user?.permissions?.includes('payroll:manage') || user?.role === 'admin';

  // Fetch payroll records
  const fetchPayrollRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPayrollRecords();
      if (response.success) {
        setPayrollRecords((response.data || []) as PayrollRecord[]);
      } else {
        setError(response.error || '급여명세서 목록을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '급여명세서 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  // Handle upload dialog open
  const handleUploadClick = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setUploadDialogOpen(true);
  };

  // Handle upload dialog close
  const handleUploadDialogClose = () => {
    setUploadDialogOpen(false);
    setSelectedRecord(null);
    setUploadFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다.');
      return;
    }

    setError(null);
    setUploadFile(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedRecord || !uploadFile) return;

    try {
      setUploading(true);
      const response = await apiService.uploadPayslip(selectedRecord._id, uploadFile);
      
      if (response.success) {
        // Update the record to show payslip exists
        setPayrollRecords(prev => 
          prev.map(record => 
            record._id === selectedRecord._id 
              ? { ...record, hasPayslip: true }
              : record
          )
        );
        handleUploadDialogClose();
      } else {
        setError(response.error || '업로드에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // Handle download
  const handleDownload = async (record: PayrollRecord) => {
    try {
      const blob = await apiService.downloadPayslipPdf(record._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${record.year}-${record.month.toString().padStart(2, '0')}-${record.user.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      setError('다운로드에 실패했습니다.');
    }
  };

  // Handle delete
  const handleDelete = async (record: PayrollRecord) => {
    if (!window.confirm(`${record.user.name}님의 ${record.year}년 ${record.month}월 급여명세서를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiService.deletePayslip(record._id);
      
      if (response.success) {
        // Update the record to show payslip doesn't exist
        setPayrollRecords(prev => 
          prev.map(r => 
            r._id === record._id 
              ? { ...r, hasPayslip: false }
              : r
          )
        );
      } else {
        setError(response.error || '삭제에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${amount?.toLocaleString()}원`;
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
          급여명세서를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        급여명세서 관리
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        급여명세서 PDF 파일을 업로드하고 관리할 수 있습니다.
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Payroll Records List */}
      <Grid container spacing={2}>
        {payrollRecords.map((record) => {
          const statusInfo = getStatusDisplay(record.paymentStatus);
          
          return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={record._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" component="h3">
                        {record.user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {record.user.department}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {record.year}년 {record.month}월
                      </Typography>
                    </Box>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body1" sx={{ mb: 2 }}>
                    실수령액: {formatCurrency(record.netSalary)}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  {/* Payslip Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {record.hasPayslip ? (
                      <>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(record)}
                        >
                          다운로드
                        </Button>
                        {canManage && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(record)}
                          >
                            삭제
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {canManage && (
                          <Button
                            size="small"
                            startIcon={<UploadIcon />}
                            onClick={() => handleUploadClick(record)}
                          >
                            PDF 업로드
                          </Button>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          급여명세서가 없습니다
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {payrollRecords.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <PdfIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              급여 데이터가 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              먼저 급여 데이터를 등록해주세요.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={handleUploadDialogClose} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            급여명세서 업로드
            <IconButton onClick={handleUploadDialogClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1">
                <strong>{selectedRecord.user.name}</strong> ({selectedRecord.user.department})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedRecord.year}년 {selectedRecord.month}월 급여명세서
              </Typography>
            </Box>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          
          <TextField
            fullWidth
            label="급여명세서 PDF 업로드"
            value={uploadFile?.name || ''}
            onClick={() => fileInputRef.current?.click()}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  파일 선택
                </Button>
              )
            }}
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" color="text.secondary">
            PDF 파일만 업로드 가능합니다. (최대 5MB)
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleUploadDialogClose}>
            취소
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            variant="contained"
          >
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};