import React, { useState, useEffect, useRef } from 'react';
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
  Paper,
  IconButton,
  Stack,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add,
  Delete,
  ContentCopy,
  Save,
  AttachMoney,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import apiService from '../services/api';
import { useNotification } from './NotificationProvider';

interface DailyWorker {
  _id?: string;
  name: string;
  salary_in_10k: number;
  salary: number;
  yearMonth: string;
  notes?: string;
  createdAt?: Date;
  createdBy?: string;
  isNew?: boolean; // Flag for new unsaved workers
}

interface DailyWorkerManagementProps {
  yearMonth: string;
}

const DailyWorkerManagement: React.FC<DailyWorkerManagementProps> = ({ yearMonth }) => {
  const [workers, setWorkers] = useState<DailyWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const { showSuccess, showError, showWarning } = useNotification();

  useEffect(() => {
    loadWorkers();
  }, [yearMonth]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`/payroll/daily-workers/${yearMonth}`);
      if (response.success && response.data) {
        setWorkers(response.data);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.error('Failed to load daily workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = () => {
    const newWorker: DailyWorker = {
      name: '',
      salary_in_10k: 0,
      salary: 0,
      yearMonth,
      notes: '',
      isNew: true,
    };
    setWorkers([...workers, newWorker]);
    
    // Focus on the new row's name field after render
    setTimeout(() => {
      const index = workers.length;
      const nameRef = inputRefs.current[`${index}-name`];
      if (nameRef) {
        nameRef.focus();
      }
    }, 100);
  };

  const updateWorker = (index: number, field: keyof DailyWorker, value: any) => {
    const updated = [...workers];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    
    // Auto-calculate salary when salary_in_10k changes
    if (field === 'salary_in_10k') {
      updated[index].salary = Number(value) * 10000;
    }
    
    setWorkers(updated);
  };

  const removeWorker = async (index: number) => {
    const worker = workers[index];
    
    if (worker.isNew) {
      // Just remove from local state if not saved yet
      setWorkers(workers.filter((_, i) => i !== index));
    } else if (worker._id) {
      // Delete from server if it exists
      try {
        const response = await apiService.delete(`/payroll/daily-workers/${worker._id}`);
        if (response.success) {
          showSuccess('삭제 완료', '일용직 급여가 삭제되었습니다');
          loadWorkers();
        }
      } catch (error) {
        showError('삭제 실패', '일용직 급여 삭제에 실패했습니다');
      }
    }
  };

  const saveAll = async () => {
    // Validation
    const validWorkers = workers.filter(w => w.name && w.salary_in_10k > 0);
    
    if (validWorkers.length === 0) {
      showWarning('경고', '저장할 일용직 급여 데이터가 없습니다');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        yearMonth,
        workers: validWorkers.map(w => ({
          _id: w._id,
          name: w.name,
          salary_in_10k: w.salary_in_10k,
          salary: w.salary_in_10k * 10000,
          notes: w.notes || '',
        })),
      };

      const response = await apiService.post('/payroll/daily-workers/bulk', payload);
      if (response.success) {
        showSuccess('저장 완료', `${validWorkers.length}명의 일용직 급여가 저장되었습니다`);
        loadWorkers(); // Reload to get server data with IDs
      }
    } catch (error) {
      showError('저장 실패', '일용직 급여 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    const month = format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko });
    let copyText = `${month} 일용직 급여\n`;
    
    workers.forEach(worker => {
      if (worker.name && worker.salary > 0) {
        copyText += `${worker.name}: ${worker.salary.toLocaleString()}원\n`;
      }
    });
    
    const total = workers.reduce((sum, w) => sum + (w.salary || 0), 0);
    copyText += `\n총 일용직 급여: ${total.toLocaleString()}원`;
    
    navigator.clipboard.writeText(copyText)
      .then(() => showSuccess('복사 완료', '일용직 급여 정보가 클립보드에 복사되었습니다'))
      .catch(() => showError('오류', '복사에 실패했습니다'));
  };

  const handleKeyNavigation = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next field or next row
      if (field === 'name') {
        inputRefs.current[`${rowIndex}-salary`]?.focus();
      } else if (field === 'salary') {
        inputRefs.current[`${rowIndex}-notes`]?.focus();
      } else if (field === 'notes') {
        // Move to next row's name field or add new row
        if (rowIndex === workers.length - 1) {
          addWorker();
        } else {
          inputRefs.current[`${rowIndex + 1}-name`]?.focus();
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey && field === 'notes' && rowIndex === workers.length - 1) {
      // Add new row when Tab on last field of last row
      e.preventDefault();
      addWorker();
    }
  };

  const totalSalary = workers.reduce((sum, w) => sum + (w.salary || 0), 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            【일용직 급여 관리】
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopy}
              disabled={workers.length === 0}
            >
              복사하기
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={saveAll}
              disabled={saving || workers.length === 0}
            >
              일괄 저장
            </Button>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addWorker}
            size="small"
          >
            행 추가
          </Button>
          <Typography variant="body2" color="text.secondary">
            ※ 일용직 급여는 만원 단위로 입력합니다
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={200}>이름</TableCell>
                <TableCell align="right" width={150}>급여(만원)</TableCell>
                <TableCell align="right" width={150}>금액(원)</TableCell>
                <TableCell>비고</TableCell>
                <TableCell align="center" width={50}>삭제</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Alert severity="info">
                      일용직 급여 데이터를 추가하려면 "행 추가" 버튼을 클릭하세요
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                workers.map((worker, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        value={worker.name}
                        onChange={(e) => updateWorker(index, 'name', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="이름 입력"
                        inputRef={(ref) => inputRefs.current[`${index}-name`] = ref}
                        onKeyDown={(e) => handleKeyNavigation(e, index, 'name')}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={worker.salary_in_10k || ''}
                        onChange={(e) => updateWorker(index, 'salary_in_10k', e.target.value)}
                        size="small"
                        fullWidth
                        inputProps={{ 
                          style: { textAlign: 'right' },
                          min: 0,
                        }}
                        placeholder="만원 단위"
                        inputRef={(ref) => inputRefs.current[`${index}-salary`] = ref}
                        onKeyDown={(e) => handleKeyNavigation(e, index, 'salary')}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {worker.salary.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={worker.notes || ''}
                        onChange={(e) => updateWorker(index, 'notes', e.target.value)}
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
                        onClick={() => removeWorker(index)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {workers.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                【요약】
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="primary" />
                  <Typography>
                    총 일용직 급여: <strong>₩{totalSalary.toLocaleString()}</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography>
                    인원: <strong>{workers.filter(w => w.name).length}명</strong>
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyWorkerManagement;