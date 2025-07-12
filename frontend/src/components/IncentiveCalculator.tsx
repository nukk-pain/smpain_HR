import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Calculate,
  Person,
  Edit,
  Save,
  PlayArrow,
  History,
  Help,
  ExpandMore,
  TrendingUp,
  Assessment,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { useAuth } from './AuthProvider';

interface IncentiveFormula {
  _id: string;
  user_id: string;
  employee_name: string;
  department: string;
  formula: string;
  variables: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_calculated: string;
}

interface CalculationResult {
  success: boolean;
  result: number;
  breakdown: Record<string, any>;
  formula_used: string;
  variables_used: Record<string, any>;
  error?: string;
}

interface SimulationResult {
  employee_id: string;
  employee_name: string;
  sales_amount: number;
  target_amount: number;
  achievement_rate: number;
  incentive_amount: number;
  bonus_tier: string;
  total_commission: number;
}

const IncentiveCalculator: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [currentFormula, setCurrentFormula] = useState<IncentiveFormula | null>(null);
  const [formulaText, setFormulaText] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, number>>({});
  const [testSalesAmount, setTestSalesAmount] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const { user } = useAuth();
  const { showNotification } = useNotification();

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

  // Load employee formula
  const loadEmployeeFormula = useCallback(async (employeeId: string) => {
    try {
      const response = await apiService.get(`/incentive/formula/${employeeId}`);
      if (response.success && response.data) {
        setCurrentFormula(response.data);
        setFormulaText(response.data.formula || '');
        setVariables(response.data.variables || {});
      } else {
        // No formula exists, set defaults
        setCurrentFormula(null);
        setFormulaText('sales_amount * 0.05'); // Default 5% commission
        setVariables({
          base_rate: 0.05,
          tier1_threshold: 1000000,
          tier1_rate: 0.03,
          tier2_threshold: 2000000,
          tier2_rate: 0.05,
          tier3_threshold: 5000000,
          tier3_rate: 0.08,
        });
      }
    } catch (error) {
      console.error('Failed to load employee formula:', error);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeFormula(selectedEmployee);
    }
  }, [selectedEmployee, loadEmployeeFormula]);

  // Validate formula
  const validateFormula = async () => {
    if (!formulaText.trim()) {
      setValidationError('Formula cannot be empty');
      return false;
    }

    try {
      const response = await apiService.post('/incentive/validate', {
        formula: formulaText,
        variables
      });

      if (response.success) {
        setValidationError('');
        return true;
      } else {
        setValidationError(response.error || 'Invalid formula');
        return false;
      }
    } catch (error: any) {
      setValidationError(error.response?.data?.error || 'Validation failed');
      return false;
    }
  };

  // Calculate incentive
  const calculateIncentive = async () => {
    if (!selectedEmployee || !testSalesAmount) {
      showNotification('warning', 'Warning', 'Please select employee and enter sales amount');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/incentive/simulate', {
        employee_id: selectedEmployee,
        sales_amount: testSalesAmount,
        formula: formulaText,
        variables
      });

      if (response.success) {
        setCalculationResult(response.data);
        showNotification('success', 'Success', 'Incentive calculated successfully');
      }
    } catch (error: any) {
      showNotification('error', 'Error', error.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Save formula
  const saveFormula = async () => {
    if (!selectedEmployee) {
      showNotification('warning', 'Warning', 'Please select an employee');
      return;
    }

    const isValid = await validateFormula();
    if (!isValid) {
      showNotification('error', 'Error', 'Please fix formula errors before saving');
      return;
    }

    try {
      await apiService.put(`/users/${selectedEmployee}/incentive-formula`, {
        formula: formulaText,
        variables
      });

      showNotification('success', 'Success', 'Formula saved successfully');
      setEditMode(false);
      loadEmployeeFormula(selectedEmployee);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to save formula');
    }
  };

  // Run batch simulation
  const runBatchSimulation = async () => {
    if (!formulaText.trim()) {
      showNotification('warning', 'Warning', 'Please enter a formula');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/incentive/batch-simulate', {
        formula: formulaText,
        variables,
        year_month: format(new Date(), 'yyyy-MM')
      });

      if (response.success) {
        setSimulationResults(response.data || []);
        showNotification('success', 'Success', 'Batch simulation completed');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Batch simulation failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle variable change
  const handleVariableChange = (varName: string, value: number) => {
    setVariables(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  // Default formula examples
  const formulaExamples = [
    {
      name: 'Simple Percentage',
      formula: 'sales_amount * base_rate',
      description: 'Fixed percentage of sales'
    },
    {
      name: 'Tiered Commission',
      formula: 'sales_amount < tier1_threshold ? sales_amount * tier1_rate : (sales_amount < tier2_threshold ? tier1_threshold * tier1_rate + (sales_amount - tier1_threshold) * tier2_rate : tier1_threshold * tier1_rate + (tier2_threshold - tier1_threshold) * tier2_rate + (sales_amount - tier2_threshold) * tier3_rate)',
      description: 'Progressive commission rates'
    },
    {
      name: 'Target-based',
      formula: 'sales_amount > target_amount ? (sales_amount - target_amount) * bonus_rate + target_amount * base_rate : sales_amount * base_rate',
      description: 'Bonus for exceeding target'
    }
  ];

  const selectedEmployeeData = employees.find(emp => emp._id === selectedEmployee);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          인센티브 계산기
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Help />}
            onClick={() => setHelpOpen(true)}
          >
            도움말
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="outlined"
              startIcon={<PlayArrow />}
              onClick={runBatchSimulation}
              disabled={loading}
            >
              전체 시뮬레이션
            </Button>
          )}
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Employee Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                직원 선택
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>직원 선택</InputLabel>
                <Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  label="직원 선택"
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.name} ({employee.department})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedEmployeeData && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    부서: {selectedEmployeeData.department}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    직급: {selectedEmployeeData.position}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    사원번호: {selectedEmployeeData.employeeId}
                  </Typography>
                </Box>
              )}

              {currentFormula && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    마지막 업데이트: {format(new Date(currentFormula.updated_at), 'MM/dd HH:mm')}
                  </Typography>
                  <Typography variant="body2">
                    상태: {currentFormula.is_active ? '활성' : '비활성'}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Formula Editor */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  인센티브 수식
                </Typography>
                <Stack direction="row" spacing={1}>
                  {user?.role === 'admin' && (
                    <>
                      {editMode ? (
                        <>
                          <Button
                            variant="contained"
                            startIcon={<Save />}
                            onClick={saveFormula}
                            size="small"
                          >
                            저장
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setEditMode(false)}
                            size="small"
                          >
                            취소
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => setEditMode(true)}
                          size="small"
                        >
                          수정
                        </Button>
                      )}
                    </>
                  )}
                </Stack>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="수식"
                value={formulaText}
                onChange={(e) => setFormulaText(e.target.value)}
                disabled={!editMode && user?.role !== 'admin'}
                error={!!validationError}
                helperText={validationError || '수식을 입력하세요 (예: sales_amount * 0.05)'}
                sx={{ mb: 2 }}
              />

              {validationError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">{validationError}</Typography>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">수식이 유효합니다</Typography>
                </Alert>
              )}

              {/* Formula Examples */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>수식 예제</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {formulaExamples.map((example, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {example.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {example.description}
                      </Typography>
                      <Paper sx={{ p: 1, bgcolor: 'background.default' }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {example.formula}
                        </Typography>
                      </Paper>
                      {editMode && (
                        <Button
                          size="small"
                          onClick={() => setFormulaText(example.formula)}
                          sx={{ mt: 1 }}
                        >
                          사용하기
                        </Button>
                      )}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* Variables */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                변수 설정
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(variables).map(([varName, value]) => (
                  <Grid item xs={12} sm={6} key={varName}>
                    <TextField
                      fullWidth
                      label={varName.replace(/_/g, ' ').toUpperCase()}
                      type="number"
                      value={value}
                      onChange={(e) => handleVariableChange(varName, Number(e.target.value))}
                      disabled={!editMode && user?.role !== 'admin'}
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>
              
              {editMode && (
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => {
                    const newVarName = prompt('Enter variable name:');
                    if (newVarName) {
                      handleVariableChange(newVarName, 0);
                    }
                  }}
                >
                  변수 추가
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Test Calculator */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                테스트 계산
              </Typography>
              <TextField
                fullWidth
                label="테스트 매출 금액"
                type="number"
                value={testSalesAmount}
                onChange={(e) => setTestSalesAmount(Number(e.target.value))}
                sx={{ mb: 2 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
              
              <Button
                fullWidth
                variant="contained"
                startIcon={<Calculate />}
                onClick={calculateIncentive}
                disabled={loading || !selectedEmployee}
              >
                인센티브 계산
              </Button>

              {calculationResult && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity={calculationResult.success ? 'success' : 'error'}>
                    {calculationResult.success ? (
                      <Box>
                        <Typography variant="h6" color="success.main">
                          {calculationResult.result.toLocaleString()}원
                        </Typography>
                        <Typography variant="body2">
                          계산 성공!
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">
                        {calculationResult.error}
                      </Typography>
                    )}
                  </Alert>

                  {calculationResult.success && calculationResult.breakdown && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        계산 세부사항:
                      </Typography>
                      <TableContainer component={Paper} size="small">
                        <Table size="small">
                          <TableBody>
                            {Object.entries(calculationResult.breakdown).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell align="right">
                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Simulation Results */}
        {simulationResults.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  전체 시뮬레이션 결과
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>직원명</TableCell>
                        <TableCell align="right">매출</TableCell>
                        <TableCell align="right">목표</TableCell>
                        <TableCell align="right">달성률</TableCell>
                        <TableCell align="right">인센티브</TableCell>
                        <TableCell>등급</TableCell>
                        <TableCell align="right">총 커미션</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {simulationResults.map((result) => (
                        <TableRow key={result.employee_id}>
                          <TableCell>{result.employee_name}</TableCell>
                          <TableCell align="right">{result.sales_amount.toLocaleString()}원</TableCell>
                          <TableCell align="right">{result.target_amount.toLocaleString()}원</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${result.achievement_rate.toFixed(1)}%`}
                              color={result.achievement_rate >= 100 ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{result.incentive_amount.toLocaleString()}원</TableCell>
                          <TableCell>{result.bonus_tier}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                              {result.total_commission.toLocaleString()}원
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>인센티브 계산기 도움말</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            사용 가능한 변수:
          </Typography>
          <Typography variant="body2" paragraph>
            - sales_amount: 매출 금액<br />
            - target_amount: 목표 금액<br />
            - achievement_rate: 달성률 (자동 계산)<br />
            - 사용자 정의 변수 (base_rate, tier1_threshold 등)
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            사용 가능한 연산자:
          </Typography>
          <Typography variant="body2" paragraph>
            - 산술: +, -, *, /, %, **<br />
            - 비교: &gt;, &lt;, &gt;=, &lt;=, ==, !=<br />
            - 논리: &&, ||<br />
            - 조건: condition ? value1 : value2
          </Typography>

          <Typography variant="h6" gutterBottom>
            예제:
          </Typography>
          <Typography variant="body2" paragraph>
            - 단순 퍼센트: sales_amount * 0.05<br />
            - 조건부: sales_amount &gt; 1000000 ? sales_amount * 0.1 : sales_amount * 0.05<br />
            - 복합: (sales_amount - target_amount) * 0.02 + target_amount * 0.05
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncentiveCalculator;