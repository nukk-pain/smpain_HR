import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  CloudUpload as UploadIcon,
  GetApp as DownloadIcon,
  Preview as PreviewIcon,
  Compare as CompareIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
// import { useDropzone } from 'react-dropzone';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

interface UploadResult {
  uploadId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  summary: any;
}

interface ComparisonResult {
  total: number;
  matches: number;
  differences: number;
  notFound: number;
  invalid: number;
  details: any[];
}

const FileUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const { showNotification } = useNotification();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showNotification('error', 'Error', 'Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'Error', 'File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const response = await apiService.uploadPayrollFile(file, yearMonth);
      setUploadResult(response.success ? response.data : null);
      showNotification('success', 'Success', 'File uploaded and parsed successfully');
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!uploadResult) return;
    
    try {
      const response = await apiService.getUploadPreview(uploadResult.uploadId);
      setPreviewData(response.success ? response.data : []);
      setIsPreviewOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load preview data');
    }
  };

  const handleCompare = async () => {
    if (!uploadResult) return;
    
    try {
      const response = await apiService.compareUploadData(uploadResult.uploadId, yearMonth);
      setComparisonResult(response.comparison);
      setIsComparisonOpen(true);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to compare data');
    }
  };

  const handleProcess = async () => {
    if (!uploadResult) return;
    
    setProcessing(true);
    try {
      await apiService.processUpload(uploadResult.uploadId, yearMonth);
      showNotification('success', 'Success', 'Data processed successfully');
      setUploadResult(null);
      setComparisonResult(null);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to process data');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.downloadPayrollTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payroll_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to download template');
    }
  };

  const handleDownloadReport = async () => {
    if (!uploadResult || !comparisonResult) return;
    
    try {
      const blob = await apiService.downloadComparisonReport(uploadResult.uploadId, yearMonth);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparison_report_${yearMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to download report');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Excel File Upload & Processing
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">File Upload</Typography>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  variant="outlined"
                  size="small"
                >
                  Template
                </Button>
              </Box>

              <TextField
                fullWidth
                label="Year Month"
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />

              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  backgroundColor: 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Click to select Excel file
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload payroll file (.xlsx, .xls)
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Maximum file size: 10MB
                  </Typography>
                </label>
              </Paper>

              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Uploading and parsing file...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upload Result */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Upload Results
              </Typography>

              {uploadResult ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    File uploaded and parsed successfully!
                  </Alert>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="h4" color="primary">
                          {uploadResult.totalRows}
                        </Typography>
                        <Typography variant="body2">Total Rows</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {uploadResult.validRows}
                        </Typography>
                        <Typography variant="body2">Valid Rows</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {uploadResult.invalidRows > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {uploadResult.invalidRows} rows have validation errors
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      startIcon={<PreviewIcon />}
                      onClick={handlePreview}
                      variant="outlined"
                      size="small"
                    >
                      Preview
                    </Button>
                    <Button
                      startIcon={<CompareIcon />}
                      onClick={handleCompare}
                      variant="outlined"
                      size="small"
                    >
                      Compare
                    </Button>
                    {comparisonResult && (
                      <>
                        <Button
                          startIcon={<ReportIcon />}
                          onClick={handleDownloadReport}
                          variant="outlined"
                          size="small"
                        >
                          Download Report
                        </Button>
                        <Button
                          startIcon={<CheckIcon />}
                          onClick={handleProcess}
                          variant="contained"
                          size="small"
                          disabled={processing}
                        >
                          {processing ? 'Processing...' : 'Process'}
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              ) : (
                <Alert severity="info">
                  Upload an Excel file to see results here
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Comparison Results */}
        {comparisonResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Comparison Results
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#e8f5e8', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main">
                        {comparisonResult.matches}
                      </Typography>
                      <Typography variant="body2">Matches</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.main">
                        {comparisonResult.differences}
                      </Typography>
                      <Typography variant="body2">Differences</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#ffebee', borderRadius: 1 }}>
                      <Typography variant="h4" color="error.main">
                        {comparisonResult.notFound}
                      </Typography>
                      <Typography variant="body2">Not Found</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="h4">
                        {comparisonResult.invalid}
                      </Typography>
                      <Typography variant="body2">Invalid</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {comparisonResult.differences > 0 && (
                  <Alert severity="warning">
                    {comparisonResult.differences} records have differences that need attention
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Upload Preview</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Base Salary</TableCell>
                <TableCell>Incentive</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row['사원번호']}</TableCell>
                  <TableCell>{row['성명']}</TableCell>
                  <TableCell>{row['부서']}</TableCell>
                  <TableCell>{row['기본급']?.toLocaleString()}</TableCell>
                  <TableCell>{row['인센티브']?.toLocaleString()}</TableCell>
                  <TableCell>{row['지급총액']?.toLocaleString()}</TableCell>
                  <TableCell>
                    {row.__isValid ? (
                      <Chip icon={<CheckIcon />} label="Valid" color="success" size="small" />
                    ) : (
                      <Chip icon={<ErrorIcon />} label="Invalid" color="error" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={isComparisonOpen} onClose={() => setIsComparisonOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Data Comparison</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>System Total</TableCell>
                <TableCell>Upload Total</TableCell>
                <TableCell>Difference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonResult?.details.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.employeeId}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={
                        item.status === 'match' ? 'success' :
                        item.status === 'different' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.system?.totalInput?.toLocaleString()}</TableCell>
                  <TableCell>{item.uploaded?.['지급총액']?.toLocaleString()}</TableCell>
                  <TableCell>
                    {item.differences?.totalInput ? (
                      <Typography color={item.differences.totalInput > 0 ? 'success.main' : 'error.main'}>
                        {item.differences.totalInput > 0 ? '+' : ''}{item.differences.totalInput.toLocaleString()}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsComparisonOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileUpload;