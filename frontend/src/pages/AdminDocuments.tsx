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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  SwapHoriz as ReplaceIcon,
  RestoreFromTrash as RestoreIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import api from '../services/api';

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
  status: 'available' | 'processing' | 'expired' | 'deleted';
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  modificationHistory?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    oldFileName?: string;
    reason?: string;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-docs-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDocuments: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [filterUser, filterType]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Admin endpoint to get all documents
      const response = await api.get('/documents/admin/all', {
        params: {
          userId: filterUser || undefined,
          type: filterType || undefined,
          includeDeleted: tabValue === 2, // Show deleted in trash tab
        }
      });
      
      if (response.success && response.data) {
        setDocuments(response.data);
      } else {
        // Fallback: construct from payslips if admin endpoint not available
        const payslipsResponse = await api.get('/documents/admin/payslips');
        if (payslipsResponse.success && payslipsResponse.data) {
          const payslipDocs = payslipsResponse.data.map((p: any) => ({
            _id: p._id,
            userId: p.userId,
            userName: p.userName || 'Unknown',
            userEmployeeId: p.employeeId,
            type: 'payslip',
            category: '급여명세서',
            title: `${p.year}년 ${p.month}월 급여명세서`,
            fileName: p.fileName || 'payslip.pdf',
            fileSize: p.fileSize || 0,
            mimeType: 'application/pdf',
            date: p.uploadedAt || p.createdAt,
            year: p.year,
            month: p.month,
            status: p.deleted ? 'deleted' : 'available',
            deleted: p.deleted,
            deletedAt: p.deletedAt,
            deletedBy: p.deletedBy,
            modificationHistory: p.modificationHistory || [],
          }));
          setDocuments(payslipDocs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      showNotification('문서 목록을 불러오는데 실패했습니다', 'error');
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

  const handleReplaceDocument = async () => {
    if (!selectedDocument || !uploadFile) {
      showNotification('파일을 선택해주세요', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('reason', replaceReason);

      const response = await api.put(`/documents/${selectedDocument._id}/replace`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success) {
        showNotification('문서가 성공적으로 교체되었습니다', 'success');
        setReplaceDialogOpen(false);
        setUploadFile(null);
        setReplaceReason('');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to replace document:', error);
      showNotification('문서 교체에 실패했습니다', 'error');
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      const response = await api.delete(`/documents/${selectedDocument._id}`, {
        data: { reason: deleteReason }
      });

      if (response.success) {
        showNotification('문서가 삭제되었습니다', 'success');
        setDeleteDialogOpen(false);
        setDeleteReason('');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      showNotification('문서 삭제에 실패했습니다', 'error');
    }
  };

  const handleRestoreDocument = async (doc: Document) => {
    try {
      const response = await api.put(`/documents/${doc._id}/restore`);
      if (response.success) {
        showNotification('문서가 복원되었습니다', 'success');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to restore document:', error);
      showNotification('문서 복원에 실패했습니다', 'error');
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
      showNotification('문서를 다운로드했습니다', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('문서 다운로드에 실패했습니다', 'error');
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

  const getFilteredDocuments = () => {
    let filtered = documents;

    // Filter by tab
    if (tabValue === 0) {
      filtered = documents.filter(d => !d.deleted);
    } else if (tabValue === 1) {
      filtered = documents.filter(d => d.modificationHistory && d.modificationHistory.length > 0);
    } else if (tabValue === 2) {
      filtered = documents.filter(d => d.deleted);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.userEmployeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  // Check if user is admin
  if (user?.role !== 'Admin' && user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          관리자 권한이 필요합니다
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AdminIcon sx={{ mr: 1 }} />
        문서 관리 (Admin)
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab 
              label={
                <Badge badgeContent={documents.filter(d => !d.deleted).length} color="primary">
                  전체 문서
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={documents.filter(d => d.modificationHistory && d.modificationHistory.length > 0).length} color="warning">
                  수정 이력
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={documents.filter(d => d.deleted).length} color="error">
                  휴지통
                </Badge>
              } 
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="검색 (문서명, 파일명, 사용자)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>사용자</InputLabel>
                <Select
                  value={filterUser}
                  label="사용자"
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u._id} value={u._id}>
                      {u.name} ({u.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>문서 타입</InputLabel>
                <Select
                  value={filterType}
                  label="문서 타입"
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
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterUser('');
                  setFilterType('');
                }}
              >
                초기화
              </Button>
            </Grid>
          </Grid>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Alert severity="info">문서가 없습니다</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>사용자</TableCell>
                    <TableCell>문서명</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>파일명</TableCell>
                    <TableCell>크기</TableCell>
                    <TableCell>날짜</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell>
                        {doc.userName || 'Unknown'}
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {doc.userEmployeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={doc.type}
                          size="small"
                          color={doc.type === 'payslip' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{doc.fileName}</TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>{formatDate(doc.date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={doc.status}
                          size="small"
                          color={doc.status === 'available' ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="다운로드">
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(doc)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="교체">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedDocument(doc);
                              setReplaceDialogOpen(true);
                            }}
                          >
                            <ReplaceIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="이력">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Alert severity="info">수정 이력이 있는 문서가 없습니다</Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredDocuments.map((doc) => (
                <Grid item xs={12} md={6} key={doc._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {doc.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        사용자: {doc.userName} ({doc.userEmployeeId})
                      </Typography>
                      <List dense>
                        {doc.modificationHistory?.map((history, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={`${history.action} - ${formatDate(history.performedAt)}`}
                              secondary={
                                <>
                                  수행자: {history.performedBy}
                                  {history.reason && <><br />사유: {history.reason}</>}
                                  {history.oldFileName && <><br />이전 파일: {history.oldFileName}</>}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Alert severity="info">삭제된 문서가 없습니다</Alert>
          ) : (
            <List>
              {filteredDocuments.map((doc) => (
                <ListItem key={doc._id} divider>
                  <ListItemText
                    primary={doc.title}
                    secondary={
                      <>
                        삭제일: {formatDate(doc.deletedAt || '')}
                        <br />
                        삭제자: {doc.deletedBy}
                        <br />
                        사용자: {doc.userName} ({doc.userEmployeeId})
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      onClick={() => handleRestoreDocument(doc)}
                    >
                      복원
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
      </Paper>

      {/* Replace Document Dialog */}
      <Dialog open={replaceDialogOpen} onClose={() => setReplaceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>문서 교체</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            선택한 문서: {selectedDocument?.title}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
            >
              새 파일 선택
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </Button>
            {uploadFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                선택된 파일: {uploadFile.name}
              </Typography>
            )}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="교체 사유"
            value={replaceReason}
            onChange={(e) => setReplaceReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceDialogOpen(false)}>취소</Button>
          <Button onClick={handleReplaceDocument} variant="contained" disabled={!uploadFile}>
            교체
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>문서 삭제</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다. 문서는 30일 후 완전히 삭제됩니다.
          </Alert>
          <Typography variant="body2" gutterBottom>
            선택한 문서: {selectedDocument?.title}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="삭제 사유"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteDocument} variant="contained" color="error" disabled={!deleteReason}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>문서 수정 이력</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {selectedDocument?.title}
          </Typography>
          <List>
            {selectedDocument?.modificationHistory?.length === 0 ? (
              <ListItem>
                <ListItemText primary="수정 이력이 없습니다" />
              </ListItem>
            ) : (
              selectedDocument?.modificationHistory?.map((history, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={`${history.action} - ${formatDate(history.performedAt)}`}
                    secondary={
                      <>
                        수행자: {history.performedBy}
                        {history.reason && <><br />사유: {history.reason}</>}
                        {history.oldFileName && <><br />이전 파일: {history.oldFileName}</>}
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDocuments;