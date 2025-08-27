import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Divider,
  InputAdornment,
  Tooltip,
  Snackbar,
  Chip,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Refresh,
  TrendingUp,
  AttachMoney,
  Undo,
  Redo,
  ContentPaste,
  ClearAll,
  FileCopy,
  ContentCopy,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { useAuth } from './AuthProvider';
import { clearSalesLocalStorage, debugSalesLocalStorage } from '../utils/clearLocalStorage';

interface CompanySales {
  total_amount: number;
  notes: string;
}

interface IndividualSales {
  user_id: string;
  employee_name?: string;
  individual_sales_in_10k: number; // 만원 단위
  individual_sales: number; // 원 단위 (계산값)
  contribution_rate?: number;
  notes: string;
}

interface HistoryState {
  companySales: CompanySales;
  individualSales: IndividualSales[];
}

interface SalesManagementProps {
  yearMonth: string;
}

const SalesManagement: React.FC<SalesManagementProps> = ({ yearMonth }) => {
  const [companySales, setCompanySales] = useState<CompanySales>({
    total_amount: 0,
    notes: '',
  });
  const [individualSales, setIndividualSales] = useState<IndividualSales[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [pasteAlert, setPasteAlert] = useState(false);
  const [incentiveResults, setIncentiveResults] = useState<any[]>([]);
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs for keyboard navigation
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  
  // Check if user has permission to save
  const canSave = user?.role === 'admin' || user?.role === 'Admin' || 
                  user?.permissions?.includes('payroll:manage');
  
  console.log('Full user object:', user);
  console.log('User role:', user?.role, 'Permissions:', user?.permissions, 'Can save:', canSave);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    const data = {
      yearMonth,
      companySales,
      individualSales,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`salesData_${yearMonth}`, JSON.stringify(data));
    setLastAutoSave(new Date());
  }, [yearMonth, companySales, individualSales]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    const savedData = localStorage.getItem(`salesData_${yearMonth}`);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.yearMonth === yearMonth) {
          return data;
        }
      } catch (error) {
        console.error('Failed to parse saved data:', error);
      }
    }
    return null;
  }, [yearMonth]);

  // Auto-save with debounce
  useEffect(() => {
    // Only auto-save if there's actual data to save
    const hasData = companySales.total_amount > 0 || 
                   individualSales.some(s => s.individual_sales_in_10k > 0);
    
    if (autoSaveEnabled && hasData) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        saveToLocalStorage();
        // Don't show notification for every auto-save, it's too noisy
        setLastAutoSave(new Date());
      }, 3000);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [companySales, individualSales, autoSaveEnabled, saveToLocalStorage]);

  // Add to history for undo/redo
  const addToHistory = useCallback(() => {
    const newState: HistoryState = {
      companySales: { ...companySales },
      individualSales: [...individualSales],
    };
    
    // Remove any states after current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Keep only last 10 states
    if (newHistory.length > 10) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [companySales, individualSales, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setCompanySales(prevState.companySales);
      setIndividualSales(prevState.individualSales);
      setHistoryIndex(historyIndex - 1);
      showInfo('실행 취소', '이전 상태로 복원되었습니다');
    }
  }, [history, historyIndex, showInfo]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setCompanySales(nextState.companySales);
      setIndividualSales(nextState.individualSales);
      setHistoryIndex(historyIndex + 1);
      showInfo('다시 실행', '다음 상태로 복원되었습니다');
    }
  }, [history, historyIndex, showInfo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+V for paste
      if (e.ctrlKey && e.key === 'v') {
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Load incentive results
  const loadIncentiveResults = useCallback(async () => {
    try {
      const response = await apiService.get(`/sales/incentives/${yearMonth}`);
      if (response.success && response.data) {
        setIncentiveResults(response.data);
      } else {
        setIncentiveResults([]);
      }
    } catch (error) {
      console.error('Failed to load incentive results:', error);
      setIncentiveResults([]);
    }
  }, [yearMonth]);

  // Load existing sales data
  const loadSalesData = useCallback(async () => {
    setLoading(true);
    try {
      // Load company sales
      const companyResponse = await apiService.get(`/sales/company/${yearMonth}`);
      if (companyResponse.success && companyResponse.data) {
        setCompanySales({
          total_amount: companyResponse.data.totalAmount || 0,
          notes: companyResponse.data.notes || '',
        });
      }

      // Load individual sales
      const individualResponse = await apiService.get(`/sales/individual/${yearMonth}`);
      if (individualResponse.success && individualResponse.data) {
        setIndividualSales(individualResponse.data.map((sale: any) => ({
          user_id: sale.userId || sale.user_id,
          employee_name: sale.employee_name || sale.userName,
          individual_sales_in_10k: Math.round((sale.individualSales || sale.sales_amount || 0) / 10000), // 원 → 만원
          individual_sales: sale.individualSales || sale.sales_amount || 0,
          contribution_rate: 0,
          notes: sale.notes || '',
        })));
      }
      
      // Load incentive results
      await loadIncentiveResults();
    } catch (error) {
      console.error('Failed to load sales data:', error);
      
      // Try to load from localStorage if server fails
      const savedData = loadFromLocalStorage();
      if (savedData) {
        showInfo('오프라인 데이터', '저장된 로컬 데이터를 불러왔습니다');
        setCompanySales(savedData.companySales);
        setIndividualSales(savedData.individualSales);
      }
    } finally {
      setLoading(false);
    }
  }, [yearMonth, loadFromLocalStorage, showInfo, loadIncentiveResults]);

  // Load employees
  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success) {
        setEmployees(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }, []);

  // Check for saved data on mount - only run once
  useEffect(() => {
    const checkAndLoadSavedData = async () => {
      // First, load fresh data from server
      await loadSalesData();
      await loadEmployees();
      
      // If no server data exists, check localStorage
      const savedData = loadFromLocalStorage();
      
      if (savedData && savedData.companySales && savedData.individualSales) {
        const savedDate = new Date(savedData.savedAt);
        const timeDiff = Date.now() - savedDate.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Check if saved data has actual content
        const hasActualData = (savedData.companySales.total_amount > 0 || 
                              (Array.isArray(savedData.individualSales) && 
                               savedData.individualSales.length > 0 &&
                               savedData.individualSales.some((s: any) => s.individual_sales_in_10k > 0)));
        
        // Only restore if data is recent and has content, AND no server data exists
        const hasServerData = companySales.total_amount > 0 || individualSales.length > 0;
        
        if (hoursDiff < 24 && hasActualData && !hasServerData) {
          // Automatically restore without asking
          setCompanySales(savedData.companySales);
          setIndividualSales(savedData.individualSales);
          showInfo('임시 저장 데이터', '자동 저장된 데이터를 불러왔습니다');
        } else if (hoursDiff >= 24 || !hasActualData) {
          // Clear old or empty data
          localStorage.removeItem(`salesData_${yearMonth}`);
        }
      }
    };
    
    checkAndLoadSavedData();
  }, [yearMonth]); // Only re-run when yearMonth changes

  // Calculate contribution rates whenever sales change
  useEffect(() => {
    if (companySales.total_amount > 0) {
      setIndividualSales(prev => prev.map(sale => ({
        ...sale,
        individual_sales: sale.individual_sales_in_10k * 10000, // 만원 → 원
        contribution_rate: (sale.individual_sales_in_10k * 10000 / companySales.total_amount) * 100,
      })));
    }
  }, [companySales.total_amount]);

  // Clear localStorage for current month
  const handleClearLocalStorage = () => {
    if (confirm(`${yearMonth}의 저장된 데이터를 모두 삭제하시겠습니까?`)) {
      clearSalesLocalStorage(yearMonth);
      showInfo('삭제 완료', '로컬 저장소가 정리되었습니다');
      // Reset to empty state
      setCompanySales({ total_amount: 0, notes: '' });
      setIndividualSales([]);
    }
  };

  // Copy employee list from previous month
  const handleCopyFromPreviousMonth = async () => {
    try {
      // Calculate previous month
      const currentDate = new Date(yearMonth + '-01');
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);
      const previousYearMonth = format(previousDate, 'yyyy-MM');
      
      // Load previous month's data
      const response = await apiService.get(`/sales/individual/${previousYearMonth}`);
      
      if (response.success && response.data && response.data.length > 0) {
        // Create new sales entries with same employees but zero amounts
        const newSales: IndividualSales[] = response.data.map((sale: any) => ({
          user_id: sale.userId || sale.user_id,
          employee_name: sale.userName || sale.employee_name,
          individual_sales_in_10k: 0, // Start with zero amount
          individual_sales: 0,
          contribution_rate: 0,
          notes: '',
        }));
        
        setIndividualSales(newSales);
        saveToHistory();
        showSuccess('복사 완료', `${format(previousDate, 'yyyy년 MM월', { locale: ko })}의 직원 명단을 가져왔습니다`);
      } else {
        showInfo('이전 데이터 없음', `${format(previousDate, 'yyyy년 MM월', { locale: ko })}에 저장된 매출 데이터가 없습니다`);
      }
    } catch (error) {
      console.error('Failed to copy from previous month:', error);
      showError('오류', '이전 달 데이터를 가져오는 중 오류가 발생했습니다');
    }
  };

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').filter(row => row.trim());
      
      if (rows.length > 0) {
        const newSales: IndividualSales[] = [];
        
        for (const row of rows) {
          const cells = row.split('\t');
          if (cells.length >= 2) {
            // First column: employee name, Second column: sales amount in 10k won
            const employeeName = cells[0].trim();
            const salesAmount = parseFloat(cells[1].replace(/[^0-9.-]/g, '')) || 0;
            
            // Find employee by name
            const employee = employees.find(emp => emp.name === employeeName);
            if (employee) {
              newSales.push({
                user_id: employee._id,
                employee_name: employee.name,
                individual_sales_in_10k: salesAmount,
                individual_sales: salesAmount * 10000,
                contribution_rate: 0,
                notes: cells[2]?.trim() || '',
              });
            }
          }
        }
        
        if (newSales.length > 0) {
          setIndividualSales(prev => [...prev, ...newSales]);
          setPasteAlert(true);
          showSuccess('붙여넣기 완료', `${newSales.length}개의 데이터를 추가했습니다`);
          addToHistory();
        }
      }
    } catch (error) {
      showError('붙여넣기 실패', '클립보드 접근에 실패했습니다');
    }
  };

  // Handle company sales change
  const handleCompanySalesChange = (field: keyof CompanySales, value: any) => {
    setCompanySales(prev => ({
      ...prev,
      [field]: field === 'total_amount' ? Number(value) || 0 : value,
    }));
    addToHistory();
  };

  // Add new row for individual sales
  const addIndividualRow = () => {
    setIndividualSales(prev => [...prev, {
      user_id: '',
      employee_name: '',
      individual_sales_in_10k: 0,
      individual_sales: 0,
      contribution_rate: 0,
      notes: '',
    }]);
  };

  // Update individual sales
  const updateIndividualSales = (index: number, field: string, value: any) => {
    setIndividualSales(prev => {
      const updated = [...prev];
      if (field === 'user_id') {
        const employee = employees.find(emp => emp._id === value);
        updated[index] = {
          ...updated[index],
          user_id: value,
          employee_name: employee?.name || '',
        };
      } else if (field === 'individual_sales_in_10k') {
        const amount = Number(value) || 0;
        const salesInWon = amount * 10000;
        updated[index] = {
          ...updated[index],
          individual_sales_in_10k: amount,
          individual_sales: salesInWon, // 만원 → 원
          contribution_rate: companySales.total_amount > 0 
            ? (salesInWon / companySales.total_amount) * 100 
            : 0,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
    addToHistory();
  };

  // Remove individual sales row
  const removeIndividualRow = (index: number) => {
    setIndividualSales(prev => prev.filter((_, i) => i !== index));
    addToHistory();
  };

  // Get available employees (not already selected)
  const getAvailableEmployees = (currentUserId: string) => {
    const selectedIds = individualSales.map(s => s.user_id).filter(id => id && id !== currentUserId);
    return employees.filter(emp => !selectedIds.includes(emp._id));
  };

  // Handle keyboard navigation
  const handleKeyNavigation = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    const key = `${rowIndex}-${field}`;
    
    if (e.key === 'Tab') {
      // Default tab behavior
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next row, same field
      const nextKey = `${rowIndex + 1}-${field}`;
      if (inputRefs.current[nextKey]) {
        inputRefs.current[nextKey]?.focus();
      } else {
        // Add new row if at the last row
        if (rowIndex === individualSales.length - 1) {
          addIndividualRow();
          setTimeout(() => {
            const newKey = `${rowIndex + 1}-employee_selector`;
            inputRefs.current[newKey]?.focus();
          }, 100);
        }
      }
    }
  };

  // Save all sales data
  const handleSaveAll = async () => {
    console.log('handleSaveAll called');
    console.log('companySales:', companySales);
    console.log('individualSales:', individualSales);
    
    // Check permission first
    if (!canSave) {
      showError('권한 없음', '매출 데이터를 저장할 권한이 없습니다. 관리자에게 문의하세요.');
      console.log('Permission denied: User does not have payroll:manage permission');
      return;
    }
    
    // Validation
    if (!companySales.total_amount) {
      showWarning('경고', '전체 매출을 입력해주세요');
      console.log('Validation failed: No company total amount');
      return;
    }

    const validIndividualSales = individualSales.filter(sale => sale.user_id && sale.individual_sales_in_10k > 0);
    console.log('validIndividualSales:', validIndividualSales);
    
    if (validIndividualSales.length === 0) {
      showWarning('경고', '최소 한 명 이상의 개인 매출을 입력해주세요');
      console.log('Validation failed: No valid individual sales');
      return;
    }

    // Warning for large values
    if (companySales.total_amount > 1000000000) {
      if (!confirm('전체 매출이 10억원을 초과합니다. 계속하시겠습니까?')) {
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        yearMonth,
        companySales: {
          total_amount: companySales.total_amount,
          notes: companySales.notes,
        },
        individualSales: validIndividualSales.map(sale => ({
          user_id: sale.user_id,
          employee_name: sale.employee_name, // Include employee name for incentive display
          individual_sales: sale.individual_sales, // Send in won (already converted from 만원)
          notes: sale.notes,
        })),
      };

      console.log('Saving payload:', JSON.stringify(payload, null, 2));
      const response = await apiService.post('/sales/bulk', payload);
      console.log('Save response:', response);
      
      if (response.success) {
        // Show main success message
        let message = response.message || '매출 데이터가 저장되었습니다';
        
        // Process incentive calculation results if available
        if (response.incentives) {
          const { calculated, errors } = response.incentives;
          
          if (calculated && calculated.length > 0) {
            // Store incentive results for display
            setIncentiveResults(calculated);
            
            message += `\n\n✅ 인센티브 자동 계산 완료: ${calculated.length}명`;
            
            // Show first few calculated amounts
            const preview = calculated.slice(0, 3).map(inc => 
              `${inc.userName}: ${inc.amount.toLocaleString()}원`
            ).join('\n');
            if (preview) {
              message += '\n' + preview;
            }
            if (calculated.length > 3) {
              message += `\n... 외 ${calculated.length - 3}명`;
            }
          } else {
            setIncentiveResults([]);
          }
          
          if (errors && errors.length > 0) {
            message += `\n\n⚠️ 인센티브 계산 실패: ${errors.length}명`;
          }
        }
        
        showSuccess('성공', message);
        // Clear localStorage after successful save
        localStorage.removeItem(`salesData_${yearMonth}`);
        loadSalesData(); // Reload to get updated data
      } else {
        console.error('Save failed:', response);
        showError('오류', response.error || '저장 중 오류가 발생했습니다');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      showError('오류', error.message || '저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const individualTotal = individualSales.reduce((sum, sale) => sum + sale.individual_sales, 0);
  const coverageRate = companySales.total_amount > 0 
    ? (individualTotal / companySales.total_amount) * 100 
    : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 매출 입력
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Ctrl+Z">
            <span>
              <IconButton 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                size="small"
              >
                <Undo />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Ctrl+Y">
            <span>
              <IconButton 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                size="small"
              >
                <Redo />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="엑셀에서 복사한 데이터 붙여넣기 (Ctrl+V)">
            <Button
              variant="outlined"
              startIcon={<ContentPaste />}
              onClick={handlePaste}
              size="small"
            >
              붙여넣기
            </Button>
          </Tooltip>
          <Tooltip title="로컬 저장소 정리">
            <IconButton
              onClick={handleClearLocalStorage}
              size="small"
              color="warning"
            >
              <ClearAll />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSalesData}
          >
            새로고침
          </Button>
          <Tooltip title={!canSave ? '관리자 권한이 필요합니다' : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveAll}
                disabled={saving || !canSave}
              >
                {saving ? <CircularProgress size={20} /> : '일괄 저장'}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Auto-save indicator */}
      {lastAutoSave && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            마지막 자동 저장: {format(lastAutoSave, 'HH:mm:ss')}
          </Typography>
        </Box>
      )}

      {/* Company Sales Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            【전체 매출】
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="회사 전체 매출"
                type="number"
                value={companySales.total_amount || ''}
                onChange={(e) => handleCompanySalesChange('total_amount', e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">원</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="비고"
                value={companySales.notes}
                onChange={(e) => handleCompanySalesChange('notes', e.target.value)}
                placeholder="전체 매출 관련 메모"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Individual Sales Section */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              【개인별 매출】
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addIndividualRow}
                size="small"
              >
                행 추가
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileCopy />}
                onClick={handleCopyFromPreviousMonth}
                size="small"
              >
                전월 명단 복사
              </Button>
              <Typography variant="caption" color="text.secondary">
                ※ 개인 매출은 만원 단위로 입력
              </Typography>
            </Stack>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" ref={tableRef}>
              <TableHead>
                <TableRow>
                  <TableCell>직원 선택</TableCell>
                  <TableCell align="right">개인 매출(만원)</TableCell>
                  <TableCell align="right">금액(원)</TableCell>
                  <TableCell align="right">기여율(%)</TableCell>
                  <TableCell>비고</TableCell>
                  <TableCell align="center" width={50}>삭제</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {individualSales.map((sale, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={sale.user_id}
                          onChange={(e) => updateIndividualSales(index, 'user_id', e.target.value)}
                          displayEmpty
                          inputRef={(ref) => inputRefs.current[`${index}-employee_selector`] = ref}
                          onKeyDown={(e) => handleKeyNavigation(e, index, 'employee_selector')}
                        >
                          <MenuItem value="">
                            <em>선택...</em>
                          </MenuItem>
                          {sale.user_id && (
                            <MenuItem value={sale.user_id}>
                              {sale.employee_name}
                            </MenuItem>
                          )}
                          {getAvailableEmployees(sale.user_id).map((emp) => (
                            <MenuItem key={emp._id} value={emp._id}>
                              {emp.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={sale.individual_sales_in_10k || ''}
                        onChange={(e) => updateIndividualSales(index, 'individual_sales_in_10k', e.target.value)}
                        size="small"
                        fullWidth
                        inputProps={{ 
                          style: { textAlign: 'right' },
                          min: 0,
                        }}
                        inputRef={(ref) => inputRefs.current[`${index}-sales`] = ref}
                        onKeyDown={(e) => handleKeyNavigation(e, index, 'sales')}
                        placeholder="만원 단위"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {sale.individual_sales.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {sale.contribution_rate ? sale.contribution_rate.toFixed(1) : '0.0'}
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={sale.notes}
                        onChange={(e) => updateIndividualSales(index, 'notes', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="메모"
                        inputRef={(ref) => inputRefs.current[`${index}-notes`] = ref}
                        onKeyDown={(e) => handleKeyNavigation(e, index, 'notes')}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => removeIndividualRow(index)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {individualSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">
                        개인별 매출 데이터를 추가하려면 "행 추가" 버튼을 클릭하세요
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          {/* Summary */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              【요약】
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney color="primary" />
                <Typography>
                  전체 매출: <strong>₩{companySales.total_amount.toLocaleString()}</strong>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="success" />
                <Typography>
                  개인 매출 합계: <strong>₩{individualTotal.toLocaleString()}</strong>
                </Typography>
              </Box>
              <Box>
                <Typography>
                  기여율: <strong>{coverageRate.toFixed(1)}%</strong>
                </Typography>
              </Box>
              <Box>
                <Typography>
                  입력 완료: <strong>{individualSales.filter(s => s.user_id).length}명</strong>
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Incentive Calculation Results - Always show */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              📊 인센티브 계산 결과
            </Typography>
            {incentiveResults.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={() => {
                  const month = format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko });
                  let copyText = `${month} 인센티브\n`;
                  
                  incentiveResults.forEach(inc => {
                    copyText += `${inc.userName}: ${inc.amount.toLocaleString()}원\n`;
                  });
                  
                  const totalIncentive = incentiveResults.reduce((sum, inc) => sum + inc.amount, 0);
                  copyText += `\n총 인센티브: ${totalIncentive.toLocaleString()}원`;
                  
                  navigator.clipboard.writeText(copyText)
                    .then(() => showSuccess('복사 완료', '인센티브 정보가 클립보드에 복사되었습니다'))
                    .catch(() => showError('오류', '복사에 실패했습니다'));
                }}
              >
                복사하기
              </Button>
            )}
          </Box>
          
          {incentiveResults.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                아직 계산된 인센티브가 없습니다.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                매출 데이터를 저장하면 자동으로 인센티브가 계산됩니다.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>직원명</TableCell>
                      <TableCell>계산 방식</TableCell>
                      <TableCell align="right">인센티브 금액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {incentiveResults.map((inc, index) => (
                      <TableRow key={index}>
                        <TableCell>{inc.userName}</TableCell>
                        <TableCell>
                          <Chip 
                            label={inc.type} 
                            size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <strong>{inc.amount.toLocaleString()}</strong>원
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {incentiveResults[0]?.calculatedAt && (
                <Typography variant="caption" color="text.secondary">
                  마지막 계산: {format(new Date(incentiveResults[0].calculatedAt), 'yyyy-MM-dd HH:mm')}
                </Typography>
              )}
              <Typography variant="h6">
                총 인센티브: {incentiveResults.reduce((sum, inc) => sum + inc.amount, 0).toLocaleString()}원
              </Typography>
            </Box>
          </>
        )}
        </CardContent>
      </Card>

      {/* Paste success snackbar */}
      <Snackbar
        open={pasteAlert}
        autoHideDuration={3000}
        onClose={() => setPasteAlert(false)}
        message="데이터를 붙여넣기했습니다"
      />
    </Box>
  );
};

export default SalesManagement;