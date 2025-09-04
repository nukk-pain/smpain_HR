import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import { EmployeeLeaveOverview } from '@/types/UnifiedLeaveOverviewTypes';
import { 
  getLeaveUsageColor, 
  getRiskLevelColor, 
  getRiskLevelLabel,
  formatLeaveBalance 
} from '@/utils/leaveOverviewUtils';

interface UnifiedLeaveOverviewTableProps {
  employees: EmployeeLeaveOverview[];
  onViewDetail?: (employee: EmployeeLeaveOverview) => void;
  onAdjustLeave?: (employeeId: string, employeeName: string) => void;
  isAdmin?: boolean;
  loading?: boolean;
}

const UnifiedLeaveOverviewTable: React.FC<UnifiedLeaveOverviewTableProps> = ({
  employees,
  onViewDetail,
  onAdjustLeave,
  isAdmin = false,
  loading = false
}) => {
  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (employees.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          데이터가 없습니다
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>이름</TableCell>
            <TableCell>부서</TableCell>
            <TableCell>직급</TableCell>
            <TableCell align="center">연차</TableCell>
            <TableCell align="center">사용</TableCell>
            <TableCell align="center">잔여</TableCell>
            <TableCell align="center">대기</TableCell>
            <TableCell align="center">사용률</TableCell>
            <TableCell align="center">위험도</TableCell>
            {isAdmin && <TableCell align="center">작업</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow 
              key={employee.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onViewDetail?.(employee)}
            >
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell align="center">{employee.annual}일</TableCell>
              <TableCell align="center">{employee.used}일</TableCell>
              <TableCell align="center">
                <Typography 
                  variant="body2" 
                  color={employee.remaining <= 5 ? 'error' : 'inherit'}
                  fontWeight={employee.remaining <= 5 ? 'bold' : 'normal'}
                >
                  {employee.remaining}일
                </Typography>
              </TableCell>
              <TableCell align="center">
                {employee.pending > 0 && (
                  <Chip 
                    label={`${employee.pending}일`} 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                  />
                )}
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={employee.usageRate}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getLeaveUsageColor(employee.usageRate),
                        borderRadius: 3
                      }
                    }}
                  />
                  <Typography variant="caption">
                    {employee.usageRate}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={getRiskLevelLabel(employee.riskLevel)}
                  size="small"
                  sx={{
                    backgroundColor: getRiskLevelColor(employee.riskLevel),
                    color: 'white'
                  }}
                />
              </TableCell>
              {isAdmin && (
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="상세보기">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail?.(employee);
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="휴가 조정">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdjustLeave?.(employee.id, employee.name);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UnifiedLeaveOverviewTable;