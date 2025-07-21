import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import {
  Calculator,
  User,
  Edit,
  Save,
  Play,
  History,
  HelpCircle,
  ChevronDown,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          인센티브 계산기
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            도움말
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="outline"
              onClick={runBatchSimulation}
              disabled={loading}
            >
              <Play className="h-4 w-4 mr-2" />
              전체 시뮬레이션
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>직원 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-select">직원 선택</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="직원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name} ({employee.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployeeData && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-sm text-gray-600">
                  부서: {selectedEmployeeData.department}
                </p>
                <p className="text-sm text-gray-600">
                  직급: {selectedEmployeeData.position}
                </p>
                <p className="text-sm text-gray-600">
                  사원번호: {selectedEmployeeData.employeeId}
                </p>
              </div>
            )}

            {currentFormula && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="text-sm">
                      마지막 업데이트: {format(new Date(currentFormula.updated_at), 'MM/dd HH:mm')}
                    </p>
                    <p className="text-sm">
                      상태: {currentFormula.is_active ? '활성' : '비활성'}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Formula Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>인센티브 수식</CardTitle>
                <div className="flex gap-2">
                  {user?.role === 'admin' && (
                    <>
                      {editMode ? (
                        <>
                          <Button
                            onClick={saveFormula}
                            size="sm"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditMode(false)}
                            size="sm"
                          >
                            취소
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setEditMode(true)}
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          수정
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formula">수식</Label>
                <Textarea
                  id="formula"
                  rows={4}
                  value={formulaText}
                  onChange={(e) => setFormulaText(e.target.value)}
                  disabled={!editMode && user?.role !== 'admin'}
                  placeholder="수식을 입력하세요 (예: sales_amount * 0.05)"
                  className={validationError ? 'border-red-500' : ''}
                />
                {validationError && (
                  <p className="text-sm text-red-500">{validationError}</p>
                )}
              </div>

              {validationError ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>수식이 유효합니다</AlertDescription>
                </Alert>
              )}

              {/* Formula Examples */}
              <Accordion type="single" collapsible>
                <AccordionItem value="examples">
                  <AccordionTrigger>수식 예제</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {formulaExamples.map((example, index) => (
                        <div key={index} className="space-y-2">
                          <h4 className="font-medium">{example.name}</h4>
                          <p className="text-sm text-gray-600">{example.description}</p>
                          <div className="p-2 bg-gray-100 rounded font-mono text-sm">
                            {example.formula}
                          </div>
                          {editMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFormulaText(example.formula)}
                            >
                              사용하기
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Variables */}
        <Card>
          <CardHeader>
            <CardTitle>변수 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(variables).map(([varName, value]) => (
                <div key={varName} className="space-y-2">
                  <Label htmlFor={varName}>
                    {varName.replace(/_/g, ' ').toUpperCase()}
                  </Label>
                  <Input
                    id={varName}
                    type="number"
                    value={value}
                    onChange={(e) => handleVariableChange(varName, Number(e.target.value))}
                    disabled={!editMode && user?.role !== 'admin'}
                  />
                </div>
              ))}
            </div>
            
            {editMode && (
              <Button
                variant="outline"
                size="sm"
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

        {/* Test Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>테스트 계산</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-sales">테스트 매출 금액</Label>
              <Input
                id="test-sales"
                type="number"
                value={testSalesAmount}
                onChange={(e) => setTestSalesAmount(Number(e.target.value))}
                min={0}
                placeholder="매출 금액을 입력하세요"
              />
            </div>
            
            <Button
              className="w-full"
              onClick={calculateIncentive}
              disabled={loading || !selectedEmployee}
            >
              <Calculator className="h-4 w-4 mr-2" />
              인센티브 계산
            </Button>

            {calculationResult && (
              <div className="space-y-4">
                <Alert className={calculationResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {calculationResult.success ? (
                    <div>
                      <div className="text-lg font-semibold text-green-700">
                        {calculationResult.result.toLocaleString()}원
                      </div>
                      <AlertDescription>
                        계산 성공!
                      </AlertDescription>
                    </div>
                  ) : (
                    <AlertDescription>
                      {calculationResult.error}
                    </AlertDescription>
                  )}
                </Alert>

                {calculationResult.success && calculationResult.breakdown && (
                  <div>
                    <h4 className="font-medium mb-2">계산 세부사항:</h4>
                    <div className="border rounded-lg">
                      <Table>
                        <TableBody>
                          {Object.entries(calculationResult.breakdown).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell className="text-right">
                                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Simulation Results */}
      {simulationResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>전체 시뮬레이션 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직원명</TableHead>
                    <TableHead className="text-right">매출</TableHead>
                    <TableHead className="text-right">목표</TableHead>
                    <TableHead className="text-right">달성률</TableHead>
                    <TableHead className="text-right">인센티브</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead className="text-right">총 커미션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulationResults.map((result) => (
                    <TableRow key={result.employee_id}>
                      <TableCell>{result.employee_name}</TableCell>
                      <TableCell className="text-right">{result.sales_amount.toLocaleString()}원</TableCell>
                      <TableCell className="text-right">{result.target_amount.toLocaleString()}원</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={result.achievement_rate >= 100 ? 'default' : 'secondary'}>
                          {result.achievement_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{result.incentive_amount.toLocaleString()}원</TableCell>
                      <TableCell>{result.bonus_tier}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-blue-600">
                          {result.total_commission.toLocaleString()}원
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>인센티브 계산기 도움말</DialogTitle>
            <DialogDescription>
              인센티브 계산기 사용법과 수식 작성 가이드
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">사용 가능한 변수:</h3>
              <div className="text-sm space-y-1">
                <p>- sales_amount: 매출 금액</p>
                <p>- target_amount: 목표 금액</p>
                <p>- achievement_rate: 달성률 (자동 계산)</p>
                <p>- 사용자 정의 변수 (base_rate, tier1_threshold 등)</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">사용 가능한 연산자:</h3>
              <div className="text-sm space-y-1">
                <p>- 산술: +, -, *, /, %, **</p>
                <p>- 비교: &gt;, &lt;, &gt;=, &lt;=, ==, !=</p>
                <p>- 논리: &&, ||</p>
                <p>- 조건: condition ? value1 : value2</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">예제:</h3>
              <div className="text-sm space-y-1">
                <p>- 단순 퍼센트: sales_amount * 0.05</p>
                <p>- 조건부: sales_amount &gt; 1000000 ? sales_amount * 0.1 : sales_amount * 0.05</p>
                <p>- 복합: (sales_amount - target_amount) * 0.02 + target_amount * 0.05</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncentiveCalculator;