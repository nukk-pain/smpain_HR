import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  PictureAsPdf as PdfIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import api from '../services/api';
import { getDocumentTypeLabel } from '../config/documentTypes';

interface Document {
  _id: string;
  userId: string;
  userName?: string;
  userEmployeeId?: string;
  type: 'payslip' | 'certificate' | 'contract' | 'other';
  category: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  date: string;
  year?: number;
  month?: number;
  status: 'available' | 'deleted' | 'processing' | 'expired';
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  modificationHistory?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    oldFileName?: string;
    reason?: string;
  }>;
}

const AdminDocuments: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [filterUserId, filterType, includeDeleted]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterUserId) params.userId = filterUserId;
      if (filterType) params.type = filterType;
      params.includeDeleted = includeDeleted;

      const response = await api.getAdminDocuments(params);
      
      if (response.success && response.data) {
        setDocuments(response.data);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      showNotification('error', '문서 목록을 불러오는데 실패했습니다');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument || !deleteReason.trim()) {
      showNotification('warning', '삭제 사유를 입력해주세요');
      return;
    }

    try {
      await api.deleteDocument(selectedDocument._id, deleteReason);
      showNotification('success', '문서가 삭제되었습니다');
      setDeleteDialogOpen(false);
      setDeleteReason('');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      showNotification('error', '문서 삭제에 실패했습니다');
    }
  };

  const handleRestoreDocument = async (documentId: string) => {
    try {
      await api.restoreDocument(documentId);
      showNotification('success', '문서가 복원되었습니다');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to restore document:', error);
      showNotification('error', '문서 복원에 실패했습니다');
    }
  };

  const handleReplaceDocument = async () => {
    if (!selectedDocument || !replaceFile) {
      showNotification('warning', '교체할 파일을 선택해주세요');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('document', replaceFile);
      formData.append('reason', replaceReason);

      await api.replaceDocument(selectedDocument._id, formData);
      showNotification('success', '문서가 교체되었습니다');
      setReplaceDialogOpen(false);
      setReplaceFile(null);
      setReplaceReason('');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to replace document:', error);
      showNotification('error', '문서 교체에 실패했습니다');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await api.downloadDocument(doc._id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || `document_${doc._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      showNotification('success', '문서를 다운로드했습니다');
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('error', '문서 다운로드에 실패했습니다');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
  };

  const getStatusChip = (doc: Document) => {
    if (doc.deleted) {
      return <Chip label="삭제됨" size="small" color="error" />;
    }
    switch (doc.status) {
      case 'available':
        return <Chip label="사용 가능" size="small" color="success" />;
      case 'processing':
        return <Chip label="처리 중" size="small" color="warning" />;
      case 'expired':
        return <Chip label="만료됨" size="small" color="default" />;
      default:
        return <Chip label={doc.status} size="small" />;
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (user?.role !== 'admin' && user?.role?.toLowerCase() !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">관리자 권한이 필요합니다</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdminIcon sx={{ mr: 2, fontSize: 32 }} color="primary" />
        <Typography variant="h4">
          문서 관리 (Admin)
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                전체 문서
              </Typography>
              <Typography variant="h4">
                {documents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                급여명세서
              </Typography>
              <Typography variant="h4">
                {documents.filter(d => d.type === 'payslip').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                삭제된 문서
              </Typography>
              <Typography variant="h4" color="error">
                {documents.filter(d => d.deleted).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                사용자 수
              </Typography>
              <Typography variant="h4">
                {new Set(documents.map(d => d.userId)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>사용자 필터</InputLabel>
              <Select
                value={filterUserId}
                label="사용자 필터"
                onChange={(e) => setFilterUserId(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {users.map(user => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.name} ({user.employeeId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>문서 유형</InputLabel>
              <Select
                value={filterType}
                label="문서 유형"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="payslip">급여명세서</MenuItem>
                <MenuItem value="certificate">증명서</MenuItem>
                <MenuItem value="contract">계약서</MenuItem>
                <MenuItem value="other">기타</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
              }
              label="삭제된 문서 포함"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={fetchDocuments}
              startIcon={<ViewIcon />}
            >
              새로고침
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자</TableCell>
                  <TableCell>문서 제목</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>파일명</TableCell>
                  <TableCell>크기</TableCell>
                  <TableCell>날짜</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {doc.userName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {doc.userEmployeeId || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getDocumentTypeLabel(doc.type)} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {doc.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(doc.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(doc)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="다운로드">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(doc)}
                              disabled={doc.deleted}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="수정 이력">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setHistoryDialogOpen(true);
                              }}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                          {!doc.deleted ? (
                            <>
                              <Tooltip title="파일 교체">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setReplaceDialogOpen(true);
                                  }}
                                >
                                  <UploadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="삭제">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="복원">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleRestoreDocument(doc._id)}
                              >
                                <RestoreIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={documents.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="페이지당 행:"
            />
          </>
        )}
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>문서 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 문서를 삭제하시겠습니까?
            <br />
            <strong>{selectedDocument?.title}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="삭제 사유"
            fullWidth
            multiline
            rows={2}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleDeleteDocument} 
            color="error"
            disabled={!deleteReason.trim()}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog
        open={replaceDialogOpen}
        onClose={() => setReplaceDialogOpen(false)}
      >
        <DialogTitle>문서 교체</DialogTitle>
        <DialogContent>
          <DialogContentText>
            선택한 문서를 새 파일로 교체합니다.
            <br />
            <strong>{selectedDocument?.title}</strong>
          </DialogContentText>
          <Button
            variant="contained"
            component="label"
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            startIcon={<UploadIcon />}
          >
            파일 선택
            <input
              type="file"
              hidden
              accept=".pdf"
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
            />
          </Button>
          {replaceFile && (
            <Alert severity="info" sx={{ mb: 2 }}>
              선택된 파일: {replaceFile.name}
            </Alert>
          )}
          <TextField
            margin="dense"
            label="교체 사유"
            fullWidth
            multiline
            rows={2}
            value={replaceReason}
            onChange={(e) => setReplaceReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleReplaceDocument} 
            color="primary"
            disabled={!replaceFile}
          >
            교체
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>수정 이력</DialogTitle>
        <DialogContent>
          {selectedDocument?.modificationHistory && selectedDocument.modificationHistory.length > 0 ? (
            <List>
              {selectedDocument.modificationHistory.map((history, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={history.action} 
                            size="small" 
                            color={history.action === 'deleted' ? 'error' : 'default'}
                          />
                          <Typography variant="body2">
                            {formatDate(history.performedAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          {history.reason && (
                            <Typography variant="caption" display="block">
                              사유: {history.reason}
                            </Typography>
                          )}
                          {history.oldFileName && (
                            <Typography variant="caption" display="block">
                              이전 파일: {history.oldFileName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < selectedDocument.modificationHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="info">수정 이력이 없습니다</Alert>
          )}
          {selectedDocument?.deleted && (
            <Alert severity="error" sx={{ mt: 2 }}>
              삭제됨: {formatDate(selectedDocument.deletedAt || '')}
              {selectedDocument.deleteReason && (
                <Typography variant="caption" display="block">
                  사유: {selectedDocument.deleteReason}
                </Typography>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocuments;