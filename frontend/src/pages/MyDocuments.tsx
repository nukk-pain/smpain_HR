import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Article as ContractIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import api from '../services/api';

interface Document {
  _id: string;
  type: 'payslip' | 'certificate' | 'contract' | 'other';
  category: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  date: string;
  year?: number;
  month?: number;
  status: 'available' | 'processing' | 'expired';
  canDownload: boolean;
  canView: boolean;
  metadata?: {
    yearMonth?: string;
    certificateType?: string;
    purpose?: string;
    [key: string]: any;
  };
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
      id={`documents-tabpanel-${index}`}
      aria-labelledby={`documents-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MyDocuments: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [selectedYear, selectedMonth]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Add filters based on current tab
      if (tabValue === 1) params.type = 'payslip';
      if (tabValue === 2) params.type = 'certificate';
      if (tabValue === 3) params.type = 'contract';
      
      if (selectedYear) params.year = parseInt(selectedYear);
      if (selectedMonth) params.month = parseInt(selectedMonth);

      const response = await api.getMyDocuments(params);
      
      if (response.success && response.data) {
        setDocuments(response.data);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      showNotification('문서 목록을 불러오는데 실패했습니다', 'error');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event: SelectChangeEvent) => {
    setSelectedMonth(event.target.value);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await api.downloadDocument(doc._id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || `document_${doc._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
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

  const handleView = (doc: Document) => {
    setSelectedDocument(doc);
    setPdfViewerOpen(true);
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
    return date.toLocaleDateString('ko-KR');
  };

  const getFilteredDocuments = () => {
    let filtered = documents;
    
    // Filter by tab
    if (tabValue === 1) filtered = documents.filter(d => d.type === 'payslip');
    else if (tabValue === 2) filtered = documents.filter(d => d.type === 'certificate');
    else if (tabValue === 3) filtered = documents.filter(d => d.type === 'contract');
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'payslip':
        return <PdfIcon color="error" />;
      case 'certificate':
        return <DocumentIcon color="primary" />;
      case 'contract':
        return <ContractIcon color="secondary" />;
      default:
        return <FolderIcon />;
    }
  };

  const filteredDocuments = getFilteredDocuments();

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        내 문서함
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`전체 (${documents.length})`} />
            <Tab label={`급여명세서 (${documents.filter(d => d.type === 'payslip').length})`} />
            <Tab label={`증명서 (${documents.filter(d => d.type === 'certificate').length})`} />
            <Tab label={`계약서 (${documents.filter(d => d.type === 'contract').length})`} />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="문서 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            {tabValue === 1 && (
              <>
                <Grid item xs={6} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>연도</InputLabel>
                    <Select
                      value={selectedYear}
                      label="연도"
                      onChange={handleYearChange}
                    >
                      {yearOptions.map(year => (
                        <MenuItem key={year} value={year.toString()}>
                          {year}년
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>월</InputLabel>
                    <Select
                      value={selectedMonth}
                      label="월"
                      onChange={handleMonthChange}
                    >
                      <MenuItem value="">전체</MenuItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <MenuItem key={month} value={month.toString()}>
                          {month}월
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
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
            <List>
              {filteredDocuments.map((doc) => (
                <ListItem key={doc._id} divider>
                  <ListItemIcon>
                    {getDocumentIcon(doc.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={doc.title}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {doc.fileName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDate(doc.date)} • {formatFileSize(doc.fileSize)}
                        </Typography>
                      </Box>
                    }
                  />
                  {doc.status === 'available' && (
                    <Chip
                      label="다운로드 가능"
                      size="small"
                      color="success"
                      sx={{ mr: 2 }}
                    />
                  )}
                  <ListItemSecondaryAction>
                    {doc.canView && (
                      <Tooltip title="미리보기">
                        <IconButton
                          edge="end"
                          onClick={() => handleView(doc)}
                          sx={{ mr: 1 }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {doc.canDownload && (
                      <Tooltip title="다운로드">
                        <IconButton
                          edge="end"
                          onClick={() => handleDownload(doc)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Alert severity="info">급여명세서가 없습니다</Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredDocuments.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PdfIcon color="error" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {doc.year}년 {doc.month}월
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        파일: {doc.fileName}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        크기: {formatFileSize(doc.fileSize)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        업로드: {formatDate(doc.date)}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleView(doc)}
                      >
                        미리보기
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(doc)}
                      >
                        다운로드
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Alert severity="info">
            증명서 발급 기능은 준비 중입니다
          </Alert>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Alert severity="info">
            계약서 관리 기능은 준비 중입니다
          </Alert>
        </TabPanel>
      </Paper>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.title}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info">
            PDF 미리보기 기능은 추가 구현이 필요합니다
          </Alert>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MyDocuments;