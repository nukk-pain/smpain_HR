import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Box,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Settings as SettingsIcon, Visibility as VisibilityIcon } from '@mui/icons-material';

interface EmployeeLeaveOverview {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  usageRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface VirtualEmployeeListProps {
  employees: EmployeeLeaveOverview[];
  onAdjustClick: (employee: EmployeeLeaveOverview) => void;
  onViewDetail: (employee: EmployeeLeaveOverview) => void;
  height?: number;
}

const ITEM_HEIGHT = 72; // Standard Material-UI table row height

const VirtualEmployeeList: React.FC<VirtualEmployeeListProps> = ({
  employees,
  onAdjustClick,
  onViewDetail,
  height = 600,
}) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '높음';
      case 'medium': return '중간';
      case 'low': return '낮음';
      default: return riskLevel;
    }
  };

  const getLeaveUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'error';
    if (percentage >= 50) return 'warning';
    return 'success';
  };

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const employee = employees[index];
    
    return (
      <Box
        style={style}
        data-testid={`employee-row-${index}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(224, 224, 224, 1)',
          px: 2,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Box sx={{ flex: '1 1 15%', pr: 1 }}>{employee.name}</Box>
        <Box sx={{ flex: '1 1 15%', pr: 1 }}>{employee.department}</Box>
        <Box sx={{ flex: '1 1 10%', pr: 1 }}>{employee.position}</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>{employee.totalAnnualLeave}</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>{employee.usedAnnualLeave}</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>{employee.pendingAnnualLeave}</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>{employee.remainingAnnualLeave}</Box>
        <Box sx={{ flex: '0 0 12%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={employee.usageRate}
            color={getLeaveUsageColor(employee.usageRate)}
            sx={{ width: 60, height: 8, borderRadius: 1 }}
          />
          <Typography variant="body2" sx={{ minWidth: 35 }}>{employee.usageRate.toFixed(0)}%</Typography>
        </Box>
        <Box sx={{ flex: '0 0 8%', display: 'flex', justifyContent: 'center' }}>
          <Chip
            label={getRiskLabel(employee.riskLevel)}
            color={getRiskColor(employee.riskLevel) as any}
            size="small"
          />
        </Box>
        <Box sx={{ flex: '0 0 8%', display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title="상세보기">
            <IconButton
              size="small"
              onClick={() => onViewDetail(employee)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="휴가 조정">
            <IconButton
              size="small"
              onClick={() => onAdjustClick(employee)}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }, [employees, onAdjustClick, onViewDetail, getRiskColor, getRiskLabel, getLeaveUsageColor]);

  return (
    <Paper elevation={1}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: '2px solid rgba(224, 224, 224, 1)',
          backgroundColor: 'grey.50',
          fontWeight: 500,
        }}
      >
        <Box sx={{ flex: '1 1 15%' }}>직원명</Box>
        <Box sx={{ flex: '1 1 15%' }}>부서</Box>
        <Box sx={{ flex: '1 1 10%' }}>직급</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>총 연차</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>사용</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>대기</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>잔여</Box>
        <Box sx={{ flex: '0 0 12%', textAlign: 'center' }}>사용률</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>위험도</Box>
        <Box sx={{ flex: '0 0 8%', textAlign: 'center' }}>작업</Box>
      </Box>
      
      {/* Virtual List */}
      <Box data-testid="virtual-employee-list">
        <List
          height={height}
          itemCount={employees.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
        >
          {Row}
        </List>
      </Box>
    </Paper>
  );
};

export default VirtualEmployeeList;