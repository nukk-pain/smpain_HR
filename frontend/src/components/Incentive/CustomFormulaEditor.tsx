/**
 * AI-HEADER
 * @intent: Component for editing custom incentive calculation formulas
 * @domain_meaning: UI for creating and validating commission calculation expressions
 * @misleading_names: None
 * @data_contracts: Formula string input/output, validation via API
 * @pii: No PII
 * @invariants: Formula must be valid syntax, safe variables only
 * @rag_keywords: formula editor, custom calculation, expression builder
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  ContentCopy,
  Help
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface CustomFormulaEditorProps {
  formula: string;
  onChange: (formula: string) => void;
  disabled?: boolean;
  onValidate?: () => Promise<boolean>;
}

const CustomFormulaEditor: React.FC<CustomFormulaEditorProps> = ({
  formula,
  onChange,
  disabled = false,
  onValidate
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  // Available variables
  const variables = [
    { name: 'personalSales', description: '개인 매출액', example: '10000000' },
    { name: 'totalSales', description: '전체 매출액', example: '100000000' },
    { name: 'teamSales', description: '팀 매출액', example: '30000000' },
    { name: 'sales', description: '개인 매출액 (별칭)', example: '10000000' },
    { name: 'baseSalary', description: '기본급', example: '3000000' },
    { name: 'years', description: '근속년수', example: '5' },
    { name: 'performance', description: '성과점수', example: '85' }
  ];

  // Example formulas
  const exampleFormulas = [
    {
      name: '단순 비율',
      formula: 'personalSales * 0.05',
      description: '개인 매출의 5%'
    },
    {
      name: '조건부 비율',
      formula: 'personalSales > 5000000 ? personalSales * 0.10 : personalSales * 0.05',
      description: '500만원 초과시 10%, 이하시 5%'
    },
    {
      name: '초과분 계산',
      formula: 'personalSales > 10000000 ? (personalSales - 10000000) * 0.15 : 0',
      description: '1천만원 초과분의 15%'
    },
    {
      name: '팀 성과 반영',
      formula: '(personalSales * 0.05) + (teamSales * 0.01)',
      description: '개인 5% + 팀 1%'
    },
    {
      name: '근속년수 가산',
      formula: 'personalSales * (0.05 + (years * 0.005))',
      description: '기본 5% + 연차당 0.5% 추가'
    }
  ];

  // Validate formula on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formula) {
        validateFormula();
      } else {
        setIsValid(null);
        setValidationMessage('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formula]);

  const validateFormula = async () => {
    if (!formula) return;

    setIsValidating(true);
    try {
      // Test with sample data
      const testData = {
        personal: 10000000,
        total: 100000000,
        team: 30000000
      };

      const response = await apiService.validateIncentiveFormula(formula, testData);
      
      if (response.success && response.data) {
        setIsValid(response.data.isValid);
        if (response.data.isValid) {
          setValidationMessage(`테스트 결과: ${response.data.testResult?.toLocaleString()}원`);
        } else {
          setValidationMessage(response.data.errors?.join(', ') || '수식이 유효하지 않습니다');
        }
      } else {
        setIsValid(false);
        setValidationMessage('검증 실패');
      }
    } catch (error) {
      setIsValid(false);
      setValidationMessage('수식 검증 중 오류가 발생했습니다');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopyExample = (exampleFormula: string) => {
    onChange(exampleFormula);
  };

  const insertVariable = (varName: string) => {
    const newFormula = formula ? `${formula} ${varName}` : varName;
    onChange(newFormula);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        커스텀 수식
        <Tooltip title="JavaScript 수식을 사용하여 인센티브를 계산합니다">
          <IconButton size="small">
            <Help fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      {/* Formula Input */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="수식"
        value={formula}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        error={isValid === false}
        helperText={
          isValidating ? '검증 중...' : validationMessage
        }
        sx={{ mb: 2 }}
        InputProps={{
          sx: { fontFamily: 'monospace' }
        }}
      />

      {/* Validation Status */}
      {isValid !== null && !isValidating && (
        <Alert 
          severity={isValid ? 'success' : 'error'}
          icon={isValid ? <CheckCircle /> : <Error />}
          sx={{ mb: 2 }}
        >
          {isValid ? '유효한 수식입니다' : '수식에 오류가 있습니다'}
        </Alert>
      )}

      {/* Available Variables */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>사용 가능한 변수</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {variables.map((variable) => (
              <Tooltip
                key={variable.name}
                title={`${variable.description} (예: ${variable.example})`}
              >
                <Chip
                  label={variable.name}
                  onClick={() => !disabled && insertVariable(variable.name)}
                  clickable={!disabled}
                  size="small"
                  sx={{ mb: 1 }}
                />
              </Tooltip>
            ))}
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            변수를 클릭하여 수식에 추가할 수 있습니다
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Example Formulas */}
      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>수식 예제</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {exampleFormulas.map((example, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2 }} variant="outlined">
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    {example.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {example.description}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                      mt: 1
                    }}
                  >
                    {example.formula}
                  </Typography>
                </Box>
                {!disabled && (
                  <IconButton
                    onClick={() => handleCopyExample(example.formula)}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Paper>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Help Text */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          <strong>지원되는 연산자:</strong><br />
          • 산술: +, -, *, /, %<br />
          • 비교: &gt;, &lt;, &gt;=, &lt;=, ==, !=<br />
          • 조건: condition ? value1 : value2<br />
          • 함수: Math.max(), Math.min(), Math.round()
        </Typography>
      </Alert>
    </Box>
  );
};

export default CustomFormulaEditor;