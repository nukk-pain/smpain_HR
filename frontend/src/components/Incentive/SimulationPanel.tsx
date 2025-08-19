/**
 * AI-HEADER
 * @intent: Component for simulating incentive calculations with test data
 * @domain_meaning: UI for testing commission calculations before applying
 * @misleading_names: None
 * @data_contracts: Uses IncentiveConfig and SalesData types
 * @pii: No PII in simulations
 * @invariants: Test data must be non-negative
 * @rag_keywords: simulation panel, incentive test, commission preview
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  InputAdornment,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';
import { Calculate, TrendingUp, AttachMoney } from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useNotification } from '../NotificationProvider';
import { IncentiveConfig, SalesData, IncentiveCalculationResult } from '../../types/incentive';
import { format } from 'date-fns';

interface SimulationPanelProps {
  config: IncentiveConfig;
  userId?: string;
  compact?: boolean;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({
  config,
  userId,
  compact = false
}) => {
  const [salesData, setSalesData] = useState<SalesData>({
    personal: 10000000,
    total: 100000000,
    team: 30000000
  });
  const [simulationResult, setSimulationResult] = useState<number | null>(null);
  const [calculationResult, setCalculationResult] = useState<IncentiveCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [yearMonth, setYearMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { showNotification } = useNotification();

  const handleSimulate = async () => {
    if (!config.isActive && !compact) {
      showNotification('warning', 'Warning', '인센티브가 비활성화 상태입니다');
    }

    setLoading(true);
    try {
      const response = await apiService.simulateIncentive(config, salesData);
      
      if (response.success && response.data) {
        setSimulationResult(response.data.amount);
        showNotification('success', 'Success', '시뮬레이션 완료');
      } else {
        showNotification('error', 'Error', '시뮬레이션 실패');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      showNotification('error', 'Error', '시뮬레이션 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!userId) {
      showNotification('warning', 'Warning', '사용자를 선택해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.calculateIncentive(userId, yearMonth);
      
      if (response.success && response.data) {
        setCalculationResult(response.data);
        showNotification('success', 'Success', '실제 계산 완료');
      } else {
        showNotification('error', 'Error', '계산 실패');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      showNotification('error', 'Error', '계산 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculateCommissionRate = (): string => {
    if (!simulationResult || !salesData.personal) return '0%';
    const rate = (simulationResult / salesData.personal) * 100;
    return `${rate.toFixed(2)}%`;
  };

  if (compact) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          빠른 시뮬레이션
        </Typography>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              label="개인 매출"
              type="number"
              value={salesData.personal}
              onChange={(e) => setSalesData({ ...salesData, personal: parseInt(e.target.value) || 0 })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              label="전체 매출"
              type="number"
              value={salesData.total}
              onChange={(e) => setSalesData({ ...salesData, total: parseInt(e.target.value) || 0 })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={handleSimulate}
              disabled={loading}
              fullWidth
              size="small"
            >
              계산
            </Button>
          </Grid>
        </Grid>
        {simulationResult !== null && (
          <Alert severity="info" sx={{ mt: 1 }}>
            예상 인센티브: {formatCurrency(simulationResult)}
          </Alert>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        <Calculate sx={{ verticalAlign: 'middle', mr: 1 }} />
        인센티브 계산 시뮬레이션
      </Typography>

      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
        {/* Test Sales Data Input */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="개인 매출"
              type="number"
              value={salesData.personal}
              onChange={(e) => setSalesData({ ...salesData, personal: parseInt(e.target.value) || 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoney />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">원</InputAdornment>,
                inputProps: { min: 0, step: 100000 }
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="전체 매출"
              type="number"
              value={salesData.total}
              onChange={(e) => setSalesData({ ...salesData, total: parseInt(e.target.value) || 0 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">원</InputAdornment>,
                inputProps: { min: 0, step: 1000000 }
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="팀 매출"
              type="number"
              value={salesData.team}
              onChange={(e) => setSalesData({ ...salesData, team: parseInt(e.target.value) || 0 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">원</InputAdornment>,
                inputProps: { min: 0, step: 100000 }
              }}
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Calculate />}
            onClick={handleSimulate}
            disabled={loading}
          >
            시뮬레이션 실행
          </Button>

          {userId && (
            <>
              <TextField
                label="계산 월"
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                size="small"
                sx={{ width: 200 }}
              />
              <Button
                variant="outlined"
                startIcon={<TrendingUp />}
                onClick={handleCalculate}
                disabled={loading}
              >
                실제 데이터로 계산
              </Button>
            </>
          )}
        </Box>

        {/* Simulation Result */}
        {simulationResult !== null && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" icon={<AttachMoney />}>
              <Typography variant="h6">
                예상 인센티브: {formatCurrency(simulationResult)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                실효 요율: {calculateCommissionRate()}
              </Typography>
            </Alert>

            {/* Result Breakdown */}
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>계산 유형</TableCell>
                    <TableCell align="right">
                      <Chip label={config.type} size="small" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>개인 매출</TableCell>
                    <TableCell align="right">{formatCurrency(salesData.personal || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>전체 매출</TableCell>
                    <TableCell align="right">{formatCurrency(salesData.total || 0)}</TableCell>
                  </TableRow>
                  {config.parameters.rate && (
                    <TableRow>
                      <TableCell>적용 요율</TableCell>
                      <TableCell align="right">{(config.parameters.rate * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  )}
                  {config.parameters.threshold && (
                    <TableRow>
                      <TableCell>기준 금액</TableCell>
                      <TableCell align="right">{formatCurrency(config.parameters.threshold)}</TableCell>
                    </TableRow>
                  )}
                  {config.parameters.minAmount && (
                    <TableRow>
                      <TableCell>최소 보장</TableCell>
                      <TableCell align="right">{formatCurrency(config.parameters.minAmount)}</TableCell>
                    </TableRow>
                  )}
                  {config.parameters.maxAmount && (
                    <TableRow>
                      <TableCell>최대 한도</TableCell>
                      <TableCell align="right">{formatCurrency(config.parameters.maxAmount)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>최종 인센티브</strong></TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" color="primary">
                        {formatCurrency(simulationResult)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Actual Calculation Result */}
        {calculationResult && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              실제 계산 결과 ({yearMonth})
            </Typography>
            <Alert severity="info">
              <Typography variant="h6">
                실제 인센티브: {formatCurrency(calculationResult.amount)}
              </Typography>
              {calculationResult.details.reason && (
                <Typography variant="body2" color="text.secondary">
                  {calculationResult.details.reason}
                </Typography>
              )}
            </Alert>
          </Box>
        )}

        {/* Status Warning */}
        {!config.isActive && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            현재 인센티브 계산이 비활성화되어 있습니다. 실제 급여 계산에는 적용되지 않습니다.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default SimulationPanel;