/**
 * AI-HEADER
 * @intent: Component for inputting incentive calculation parameters
 * @domain_meaning: UI for entering commission rates, thresholds, and limits
 * @misleading_names: None
 * @data_contracts: Uses IncentiveParameters type, validates numeric inputs
 * @pii: No PII
 * @invariants: Rate 0-1, amounts non-negative, min <= max
 * @rag_keywords: parameter input, commission settings, rate threshold UI
 */

import React from 'react';
import {
  Grid,
  TextField,
  InputAdornment,
  Typography,
  Box,
  Tooltip,
  IconButton
} from '@mui/material';
import { Help } from '@mui/icons-material';
import { IncentiveType, IncentiveParameters } from '../../types/incentive';

interface ParameterInputsProps {
  type: IncentiveType;
  parameters: IncentiveParameters;
  onChange: (parameters: IncentiveParameters) => void;
  disabled?: boolean;
}

const ParameterInputs: React.FC<ParameterInputsProps> = ({
  type,
  parameters,
  onChange,
  disabled = false
}) => {
  const handleRateChange = (value: string) => {
    const rate = parseFloat(value);
    if (!isNaN(rate)) {
      onChange({ ...parameters, rate: rate / 100 }); // Convert percentage to decimal
    }
  };

  const handleThresholdChange = (value: string) => {
    const threshold = parseInt(value);
    if (!isNaN(threshold)) {
      onChange({ ...parameters, threshold });
    }
  };

  const handleMinAmountChange = (value: string) => {
    const minAmount = value ? parseInt(value) : undefined;
    onChange({ ...parameters, minAmount });
  };

  const handleMaxAmountChange = (value: string) => {
    const maxAmount = value ? parseInt(value) : undefined;
    onChange({ ...parameters, maxAmount });
  };

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return '';
    return value.toLocaleString();
  };

  const renderFields = () => {
    switch (type) {
      case 'PERSONAL_PERCENT':
      case 'TOTAL_PERCENT':
        return (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="요율"
                type="number"
                value={(parameters.rate || 0) * 100}
                onChange={(e) => handleRateChange(e.target.value)}
                disabled={disabled}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, max: 100, step: 0.1 }
                }}
                helperText="매출액에 적용할 인센티브 비율"
              />
            </Grid>
          </>
        );

      case 'PERSONAL_EXCESS':
      case 'TOTAL_EXCESS':
        return (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="기준 금액"
                type="number"
                value={parameters.threshold || ''}
                onChange={(e) => handleThresholdChange(e.target.value)}
                disabled={disabled}
                InputProps={{
                  endAdornment: <InputAdornment position="end">원</InputAdornment>,
                  inputProps: { min: 0, step: 100000 }
                }}
                helperText="이 금액을 초과한 부분에만 인센티브 적용"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="초과분 요율"
                type="number"
                value={(parameters.rate || 0) * 100}
                onChange={(e) => handleRateChange(e.target.value)}
                disabled={disabled}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, max: 100, step: 0.1 }
                }}
                helperText="초과 금액에 적용할 인센티브 비율"
              />
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        계산 파라미터
        <Tooltip title="인센티브 계산에 사용되는 변수들입니다">
          <IconButton size="small">
            <Help fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      <Grid container spacing={2}>
        {renderFields()}

        {/* Common optional fields */}
        <Grid size={12}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            선택 설정 (공통)
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="최소 인센티브"
            type="number"
            value={parameters.minAmount || ''}
            onChange={(e) => handleMinAmountChange(e.target.value)}
            disabled={disabled}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>,
              inputProps: { min: 0, step: 10000 }
            }}
            helperText="보장되는 최소 인센티브 금액"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="최대 인센티브"
            type="number"
            value={parameters.maxAmount || ''}
            onChange={(e) => handleMaxAmountChange(e.target.value)}
            disabled={disabled}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>,
              inputProps: { min: 0, step: 10000 }
            }}
            helperText="인센티브 상한선 (cap)"
          />
        </Grid>
      </Grid>

      {/* Example calculation */}
      {!disabled && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            계산 예시
          </Typography>
          {type === 'PERSONAL_PERCENT' && (
            <Typography variant="body2">
              개인 매출 10,000,000원 × {((parameters.rate || 0) * 100).toFixed(1)}% = {' '}
              <strong>{formatCurrency(10000000 * (parameters.rate || 0))}원</strong>
            </Typography>
          )}
          {type === 'TOTAL_PERCENT' && (
            <Typography variant="body2">
              전체 매출 100,000,000원 × {((parameters.rate || 0) * 100).toFixed(1)}% = {' '}
              <strong>{formatCurrency(100000000 * (parameters.rate || 0))}원</strong>
            </Typography>
          )}
          {type === 'PERSONAL_EXCESS' && (
            <Typography variant="body2">
              개인 매출 10,000,000원 - 기준 {formatCurrency(parameters.threshold)}원 = {' '}
              {formatCurrency(Math.max(0, 10000000 - (parameters.threshold || 0)))}원 × {' '}
              {((parameters.rate || 0) * 100).toFixed(1)}% = {' '}
              <strong>
                {formatCurrency(Math.max(0, 10000000 - (parameters.threshold || 0)) * (parameters.rate || 0))}원
              </strong>
            </Typography>
          )}
          {type === 'TOTAL_EXCESS' && (
            <Typography variant="body2">
              전체 매출 100,000,000원 - 기준 {formatCurrency(parameters.threshold)}원 = {' '}
              {formatCurrency(Math.max(0, 100000000 - (parameters.threshold || 0)))}원 × {' '}
              {((parameters.rate || 0) * 100).toFixed(1)}% = {' '}
              <strong>
                {formatCurrency(Math.max(0, 100000000 - (parameters.threshold || 0)) * (parameters.rate || 0))}원
              </strong>
            </Typography>
          )}

          {/* Apply min/max limits */}
          {(parameters.minAmount || parameters.maxAmount) && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {parameters.minAmount && `최소: ${formatCurrency(parameters.minAmount)}원`}
              {parameters.minAmount && parameters.maxAmount && ' | '}
              {parameters.maxAmount && `최대: ${formatCurrency(parameters.maxAmount)}원`}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ParameterInputs;