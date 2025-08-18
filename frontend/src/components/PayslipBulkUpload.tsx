import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  CloudUpload,
  PictureAsPdf,
  CheckCircle,
  Error,
  Warning,
  Delete,
  Person,
  Edit,
  ExpandMore,
  History,
  Info,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../components/AuthProvider';
import api from '../services/api';

interface PayslipFile {
  file: File;
  fileName: string;
  parsedData: {
    company?: string;
    employmentType?: string;
    yearMonth?: string;
    employeeName?: string;
  };
  matchStatus: 'pending' | 'matched' | 'failed' | 'manual';
  matchedUserId?: string;
  matchedUser?: {
    id: string;
    name: string;
    employeeId: string;
    department: string;
  };
  error?: string;
}

interface MatchingDialogProps {
  open: boolean;
  file: PayslipFile | null;
  availableUsers: Array<{
    id: string;
    name: string;
    employeeId: string;
    department: string;
  }>;
  onClose: () => void;
  onConfirm: (userId: string) => void;
}

const MatchingDialog: React.FC<MatchingDialogProps> = ({
  open,
  file,
  availableUsers,
  onClose,
  onConfirm,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleConfirm = () => {
    if (selectedUserId) {
      onConfirm(selectedUserId);
      setSelectedUserId('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>직원 매칭 확인</DialogTitle>
      <DialogContent>
        {file && (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              파일: {file.fileName}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              파싱된 이름: {file.parsedData.employeeName}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>직원 선택</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="직원 선택"
              >
                <MenuItem value="">
                  <em>건너뛰기</em>
                </MenuItem>
                {availableUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.department})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedUserId}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const PayslipBulkUpload: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<PayslipFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false);
  const [currentMatchingFile, setCurrentMatchingFile] = useState<PayslipFile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  // Memoized values for performance - moved before useEffect
  const matchedCount = useMemo(() => 
    files.filter((f) => f.matchStatus === 'matched').length, 
    [files]
  );
  
  const totalCount = files.length;
  
  const canUpload = useMemo(() => 
    !isUploading && matchedCount > 0,
    [isUploading, matchedCount]
  );

  const loadUploadHistory = async () => {
    try {
      const response = await api.get('/reports/payslip/upload-history');
      if (response && response.history) {
        setUploadHistory(response.history);
      }
    } catch (error) {
      console.error('Error loading upload history:', error);
    }
  };

  const parseFileName = (fileName: string): PayslipFile['parsedData'] => {
    const patterns = [
      {
        regex: /^(.+?)_(.+?)(\d{6})_(.+?)\.pdf$/,
        parser: (matches: RegExpMatchArray) => ({
          company: matches[1],
          employmentType: matches[2],
          yearMonth: matches[3],
          employeeName: matches[4],
        }),
      },
      {
        regex: /^(.+?)_(\d{4})-(\d{2})_(.+?)\.pdf$/,
        parser: (matches: RegExpMatchArray) => ({
          company: matches[1],
          yearMonth: matches[2] + matches[3],
          employeeName: matches[4],
        }),
      },
      {
        regex: /^(.+?)_(.+?)_(\d{8})\.pdf$/,
        parser: (matches: RegExpMatchArray) => ({
          company: matches[1],
          employeeName: matches[2],
          yearMonth: matches[3].substring(0, 6),
        }),
      },
    ];

    for (const { regex, parser } of patterns) {
      const matches = fileName.match(regex);
      if (matches) {
        return parser(matches);
      }
    }

    const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
    const parts = nameWithoutExt.split('_');
    
    return {
      employeeName: parts[parts.length - 1] || fileName,
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setSuccess(null);

    const pdfFiles = acceptedFiles.filter((file) => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    if (pdfFiles.length > 50) {
      setError('한 번에 최대 50개의 파일만 업로드 가능합니다.');
      return;
    }

    const totalSize = pdfFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      setError('전체 파일 크기가 50MB를 초과합니다.');
      return;
    }

    // Check for duplicate files
    const existingFileNames = files.map(f => f.fileName);
    const duplicateFiles: string[] = [];
    const uniqueFiles: File[] = [];

    pdfFiles.forEach((file) => {
      if (existingFileNames.includes(file.name)) {
        duplicateFiles.push(file.name);
      } else {
        uniqueFiles.push(file);
      }
    });

    if (duplicateFiles.length > 0) {
      setError(`다음 파일이 이미 추가되어 있습니다: ${duplicateFiles.join(', ')}`);
      if (uniqueFiles.length === 0) {
        return;
      }
    }

    const newFiles: PayslipFile[] = uniqueFiles.map((file) => ({
      file,
      fileName: file.name,
      parsedData: parseFileName(file.name),
      matchStatus: 'pending',
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    await matchEmployees(newFiles);
  }, [files]);

  const matchEmployees = async (filesToMatch: PayslipFile[]) => {
    try {
      const fileNames = filesToMatch.map((f) => ({
        fileName: f.fileName,
        employeeName: f.parsedData.employeeName,
      }));

      const response = await api.post('/reports/payslip/match-employees', {
        fileNames,
      });

      if (!response || !response.matches) {
        console.error('Invalid response from match-employees API:', response);
        setError('서버 응답 오류가 발생했습니다.');
        return;
      }

      const matchResults = response.matches;

      setFiles((prevFiles) => 
        prevFiles.map((file) => {
          const matchResult = matchResults.find(
            (m: any) => m.fileName === file.fileName
          );

          if (matchResult) {
            if (matchResult.matched) {
              return {
                ...file,
                matchStatus: 'matched',
                matchedUserId: matchResult.user.id,
                matchedUser: matchResult.user,
              };
            } else if (matchResult.suggestions && matchResult.suggestions.length > 0) {
              return {
                ...file,
                matchStatus: 'manual',
                error: '수동 매칭 필요',
              };
            } else {
              return {
                ...file,
                matchStatus: 'failed',
                error: '일치하는 직원을 찾을 수 없습니다.',
              };
            }
          }
          return file;
        })
      );

      if (response.availableUsers) {
        setAvailableUsers(response.availableUsers);
      }
    } catch (error: any) {
      console.error('Error matching employees:', error);
      setError('직원 매칭 중 오류가 발생했습니다.');
    }
  };

  const handleManualMatch = (file: PayslipFile) => {
    setCurrentMatchingFile(file);
    setMatchingDialogOpen(true);
  };

  const handleManualMatchConfirm = async (userId: string) => {
    if (currentMatchingFile) {
      const user = availableUsers.find((u) => u.id === userId);
      if (user) {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.fileName === currentMatchingFile.fileName
              ? {
                  ...f,
                  matchStatus: 'matched',
                  matchedUserId: userId,
                  matchedUser: user,
                  error: undefined,
                }
              : f
          )
        );
      }
    }
    setMatchingDialogOpen(false);
    setCurrentMatchingFile(null);
  };

  const handleRemoveFile = (fileName: string) => {
    setFiles((prevFiles) => prevFiles.filter((f) => f.fileName !== fileName));
  };

  const handleBulkUpload = useCallback(async () => {
    const matchedFiles = files.filter((f) => f.matchStatus === 'matched');

    console.log('📤 Starting bulk upload...', {
      totalFiles: files.length,
      matchedFiles: matchedFiles.length,
      files: matchedFiles.map(f => ({
        fileName: f.fileName,
        userId: f.matchedUserId,
        yearMonth: f.parsedData.yearMonth
      }))
    });

    if (matchedFiles.length === 0) {
      setError('업로드할 매칭된 파일이 없습니다.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      
      const mappings = matchedFiles.map((f) => ({
        fileName: f.fileName,
        userId: f.matchedUserId,
        yearMonth: f.parsedData.yearMonth,
      }));

      console.log('📋 Mappings to send:', mappings);
      
      // Add mappings as regular string field (not as file/blob)
      formData.append('mappings', JSON.stringify(mappings));

      matchedFiles.forEach((f, index) => {
        // Use the original file object directly to preserve encoding
        formData.append('payslips', f.file, f.fileName);
        console.log(`📎 Added file ${index + 1}:`, f.fileName, `(${f.file.size} bytes)`);
        console.log(`   Original file name:`, f.file.name);
      });

      console.log('🚀 Sending request to:', '/reports/payslip/bulk-upload');
      
      // Use the raw axios instance for file upload with progress tracking
      const response = await api.api.post('/reports/payslip/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
            console.log(`⏳ Upload progress: ${percentCompleted}%`);
          }
        },
      });

      console.log('✅ Response received:', response.data);

      if (response.data && response.data.success) {
        // Check for errors in results
        const failedFiles = response.data.results?.filter((r: any) => !r.success) || [];
        const successfulFiles = response.data.results?.filter((r: any) => r.success) || [];
        
        if (failedFiles.length > 0) {
          console.error('❌ Failed files:', failedFiles);
          // Store for debugging
          (window as any).lastFailedFiles = failedFiles;
          
          // Log each failed file detail
          failedFiles.forEach((f: any) => {
            console.error(`❌ File: ${f.fileName}`);
            console.error(`   Error: ${f.error}`);
            console.error(`   Full details:`, f);
          });
          
          const errorMessages = failedFiles.map((f: any) => `${f.fileName}: ${f.error}`).join('\n');
          setError(`업로드 실패:\n${errorMessages}`);
        }
        
        if (response.data.uploadedCount > 0) {
          let successMessage = `${response.data.uploadedCount}개의 급여명세서가 성공적으로 업로드되었습니다.`;
          
          // Check for duplicates in the results
          const duplicates = response.data.results?.filter((r: any) => r.isDuplicate) || [];
          if (duplicates.length > 0) {
            successMessage += ` (${duplicates.length}개 중복 제외)`;
            setDuplicateWarning(`중복된 파일: ${duplicates.map((d: any) => d.fileName).join(', ')}`);
          }
          
          setSuccess(successMessage);
        } else if (response.data.errorCount > 0) {
          console.log('⚠️ All files failed. Check the error details above.');
        }
        
        // Only remove successfully uploaded files
        setFiles(prevFiles => prevFiles.filter(f => !successfulFiles.map((s: any) => s.fileName).includes(f.fileName)));
        
        // Refresh upload history
        loadUploadHistory();
      } else {
        console.error('❌ Upload failed or no success flag:', response.data);
        setError(`업로드 실패: ${response.data?.error || response.data?.message || '알 수 없는 오류'}`);
      }
    } catch (error: any) {
      console.error('❌ Error uploading payslips:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        error: error
      });
      setError(
        error.response?.data?.message || error.response?.data?.error || '급여명세서 업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [files, loadUploadHistory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    disabled: isUploading,
  });

  const getStatusIcon = (status: PayslipFile['matchStatus']) => {
    switch (status) {
      case 'matched':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'manual':
        return <Warning color="warning" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getStatusChip = (status: PayslipFile['matchStatus']) => {
    switch (status) {
      case 'matched':
        return <Chip label="매칭 완료" color="success" size="small" />;
      case 'failed':
        return <Chip label="매칭 실패" color="error" size="small" />;
      case 'manual':
        return <Chip label="수동 매칭 필요" color="warning" size="small" />;
      default:
        return <Chip label="매칭 중..." size="small" />;
    }
  };

  // Verify upload status function
  const verifyUploadStatus = async () => {
    try {
      console.log('🔍 Verifying upload status...');
      
      // Call the new verification API
      const verifyResponse = await api.get('/payslip/verify-status');
      
      if (verifyResponse && verifyResponse.success) {
        const { stats, recentUploads } = verifyResponse;
        
        console.log('📊 Upload verification results:', {
          stats,
          recentUploads
        });
        
        if (stats.totalDbRecords > 0) {
          const message = `✅ 확인 완료: DB ${stats.totalDbRecords}개, 파일 ${stats.totalFiles}개, 유효 ${stats.validUploads}개`;
          setSuccess(message);
          
          if (stats.missingFiles > 0) {
            setDuplicateWarning(`⚠️ 경고: ${stats.missingFiles}개 파일이 누락됨`);
          }
        } else {
          setError('❌ 업로드된 파일이 없습니다 (DB: 0개, 파일: 0개)');
        }
      } else {
        // Fallback to old method
        const response = await api.get('/reports/payslip/upload-history?limit=10');
        
        if (response && response.history) {
          const recentUploads = response.history;
          console.log('📊 Recent uploads found:', recentUploads.length);
          
          if (recentUploads.length > 0) {
            const latestUpload = recentUploads[0];
            const uploadTime = new Date(latestUpload.uploadedAt);
            const now = new Date();
            const timeDiff = (now.getTime() - uploadTime.getTime()) / 1000; // in seconds
            
            if (timeDiff < 60) {
              setSuccess(`✅ 최근 업로드 확인됨: ${latestUpload.originalFileName} (${Math.round(timeDiff)}초 전)`);
            } else if (timeDiff < 3600) {
              setSuccess(`✅ 최근 업로드: ${latestUpload.originalFileName} (${Math.round(timeDiff / 60)}분 전)`);
            } else {
              setSuccess(`최근 업로드: ${latestUpload.originalFileName} (${Math.round(timeDiff / 3600)}시간 전)`);
            }
            
            console.log('Latest upload details:', latestUpload);
          } else {
            setError('업로드된 파일이 없습니다.');
          }
        } else {
          setError('업로드 기록을 확인할 수 없습니다.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error verifying upload:', error);
      setError('업로드 상태 확인 실패: ' + (error.response?.data?.error || error.message));
    }
  };

  // Load upload history on component mount
  useEffect(() => {
    loadUploadHistory();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to upload
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canUpload) {
        handleBulkUpload();
      }
      // Escape to clear all files
      if (e.key === 'Escape' && files.length > 0 && !isUploading) {
        setFiles([]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUpload, files.length, isUploading, handleBulkUpload]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          급여명세서 일괄 업로드
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={verifyUploadStatus}
            startIcon={<CheckCircle />}
          >
            업로드 확인
          </Button>
          <Tooltip title="단축키: Ctrl+Enter (업로드), Esc (전체 삭제)">
            <Chip
              label="단축키 안내"
              size="small"
              variant="outlined"
              icon={<Info />}
            />
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {duplicateWarning && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setDuplicateWarning(null)}>
          {duplicateWarning}
        </Alert>
      )}

      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'PDF 파일을 여기에 놓으세요'
            : 'PDF 파일을 드래그하거나 클릭하여 선택하세요'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          최대 50개 파일, 총 50MB까지 업로드 가능
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} disabled={isUploading}>
          파일 선택
        </Button>
      </Paper>

      {files.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">
                업로드된 파일
              </Typography>
              <Badge badgeContent={matchedCount} color="success" max={99}>
                <Badge badgeContent={totalCount} color="primary" max={99}>
                  <PictureAsPdf />
                </Badge>
              </Badge>
              {matchedCount < totalCount && (
                <Tooltip title={`${totalCount - matchedCount}개 파일이 매칭되지 않았습니다`}>
                  <Warning color="warning" fontSize="small" />
                </Tooltip>
              )}
            </Box>
            <Box>
              <Tooltip title="모든 파일을 목록에서 제거합니다">
                <Button
                  onClick={() => setFiles([])}
                  disabled={isUploading}
                  sx={{ mr: 1 }}
                >
                  전체 삭제
                </Button>
              </Tooltip>
              <Tooltip title={!canUpload ? (matchedCount === 0 ? "매칭된 파일이 없습니다" : "업로드 중입니다") : "매칭된 파일을 서버에 업로드합니다"}>
                <span>
                  <Button
                    variant="contained"
                    onClick={handleBulkUpload}
                    disabled={!canUpload}
                    startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUpload />}
                  >
                    일괄 업로드 ({matchedCount}개)
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {isUploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                업로드 진행 중... {uploadProgress}%
              </Typography>
            </Box>
          )}

          <Paper elevation={1}>
            <List>
              {files.map((file, index) => (
                <React.Fragment key={file.fileName}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      <PictureAsPdf />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{file.fileName}</Typography>
                          {getStatusChip(file.matchStatus)}
                        </Box>
                      }
                      secondary={
                        <Box component="span">
                          {file.parsedData.employeeName && (
                            <Typography variant="body2" component="span">
                              파싱된 이름: {file.parsedData.employeeName}
                            </Typography>
                          )}
                          {file.parsedData.yearMonth && (
                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                              년월: {file.parsedData.yearMonth}
                            </Typography>
                          )}
                          {file.matchedUser && (
                            <Box component="span" sx={{ mt: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Person fontSize="small" />
                              <Typography variant="body2" color="success.main" component="span">
                                {file.matchedUser.name} ({file.matchedUser.department})
                              </Typography>
                            </Box>
                          )}
                          {file.error && (
                            <Typography variant="body2" color="error" component="span" sx={{ display: 'block' }}>
                              {file.error}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    <ListItemSecondaryAction>
                      {file.matchStatus === 'manual' && (
                        <Tooltip title="수동으로 직원 선택">
                          <IconButton
                            edge="end"
                            onClick={() => handleManualMatch(file)}
                            sx={{ mr: 1 }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="파일 제거">
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveFile(file.fileName)}
                          disabled={isUploading}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </>
      )}

      <MatchingDialog
        open={matchingDialogOpen}
        file={currentMatchingFile}
        availableUsers={availableUsers}
        onClose={() => {
          setMatchingDialogOpen(false);
          setCurrentMatchingFile(null);
        }}
        onConfirm={handleManualMatchConfirm}
      />

      {/* Upload History Section */}
      {uploadHistory.length > 0 && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History />
              <Typography>업로드 이력 ({uploadHistory.length}건)</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>업로드 일시</TableCell>
                    <TableCell>파일명</TableCell>
                    <TableCell>직원명</TableCell>
                    <TableCell>년월</TableCell>
                    <TableCell>업로드자</TableCell>
                    <TableCell align="center">상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uploadHistory.slice(0, 10).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(record.uploadedAt).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>{record.originalFileName}</TableCell>
                      <TableCell>{record.userName || '-'}</TableCell>
                      <TableCell>
                        {record.year && record.month
                          ? `${record.year}년 ${record.month}월`
                          : '-'}
                      </TableCell>
                      <TableCell>{record.uploadedByName || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label="완료"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {uploadHistory.length > 10 && (
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                최근 10건만 표시됩니다.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};