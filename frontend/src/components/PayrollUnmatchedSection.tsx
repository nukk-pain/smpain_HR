import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { PayrollUnmatchedHandler } from './PayrollUnmatchedHandler';
import { PreviewRecord } from '../types/payrollUpload';

interface PayrollUnmatchedSectionProps {
  records: PreviewRecord[];
  employeeList: Array<{id: string; name: string; department: string; employeeId: string}>;
  onRecordActionChange: (rowNumber: number, action: 'process' | 'skip' | 'manual', userId?: string) => void;
}

export const PayrollUnmatchedSection: React.FC<PayrollUnmatchedSectionProps> = ({
  records,
  employeeList,
  onRecordActionChange
}) => {
  // Filter unmatched records
  const unmatchedRecords = records.filter(r => !r.matched || r.status === 'unmatched');
  
  if (unmatchedRecords.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          매칭되지 않은 직원 {unmatchedRecords.length}명
        </Typography>
        <Typography variant="body2">
          아래 직원들은 데이터베이스에서 찾을 수 없습니다. 각 직원에 대해 처리 방법을 선택해주세요.
        </Typography>
      </Alert>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>행</TableCell>
              <TableCell>Excel 직원명</TableCell>
              <TableCell>Excel 사번</TableCell>
              <TableCell>처리 방법</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unmatchedRecords.map((record) => (
              <TableRow key={record.rowNumber || record.rowIndex}>
                <TableCell>{record.rowNumber || record.rowIndex}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {record.employeeName}
                  </Typography>
                </TableCell>
                <TableCell>{record.employeeId || '-'}</TableCell>
                <TableCell>
                  <PayrollUnmatchedHandler
                    rowNumber={record.rowNumber || record.rowIndex}
                    employeeName={record.employeeName}
                    employeeList={employeeList}
                    onActionChange={(action) => {
                      if (action === 'skip') {
                        onRecordActionChange(record.rowNumber || record.rowIndex, 'skip');
                      }
                    }}
                    onEmployeeSelect={(employeeId) => {
                      if (employeeId) {
                        onRecordActionChange(record.rowNumber || record.rowIndex, 'manual', employeeId);
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};