import React from 'react';
import {
  Box,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Typography,
  Chip
} from '@mui/material';

interface PayrollUnmatchedHandlerProps {
  rowNumber: number;
  employeeName: string;
  employeeList: Array<{id: string; name: string; department: string; employeeId: string}>;
  onActionChange: (action: 'skip' | 'manual') => void;
  onEmployeeSelect: (employeeId: string | null) => void;
}

export const PayrollUnmatchedHandler: React.FC<PayrollUnmatchedHandlerProps> = ({
  rowNumber,
  employeeName,
  employeeList,
  onActionChange,
  onEmployeeSelect
}) => {
  const [selectedAction, setSelectedAction] = React.useState<'skip' | 'manual' | ''>('');
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);

  const handleActionChange = (action: string) => {
    if (action === 'skip' || action === 'manual') {
      setSelectedAction(action);
      onActionChange(action);
      if (action === 'skip') {
        setSelectedEmployee(null);
        onEmployeeSelect(null);
      }
    }
  };

  const handleEmployeeChange = (event: any, value: any) => {
    setSelectedEmployee(value);
    if (value) {
      onEmployeeSelect(value.id);
    } else {
      onEmployeeSelect(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 300 }}>
      <Select
        value={selectedAction}
        onChange={(e) => handleActionChange(e.target.value)}
        size="small"
        displayEmpty
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="">선택...</MenuItem>
        <MenuItem value="skip">건너뛰기</MenuItem>
        <MenuItem value="manual">직원 선택</MenuItem>
      </Select>
      
      {selectedAction === 'manual' && (
        <Autocomplete
          value={selectedEmployee}
          onChange={handleEmployeeChange}
          options={employeeList}
          getOptionLabel={(option) => `${option.name} (${option.department})`}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.department} | {option.employeeId}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField 
              {...params} 
              placeholder="직원 검색..." 
              size="small"
            />
          )}
          size="small"
          sx={{ minWidth: 200 }}
        />
      )}
      
      {selectedAction === 'skip' && (
        <Chip 
          label="건너뛰기 선택됨" 
          size="small" 
          color="warning" 
        />
      )}
      
      {selectedAction === 'manual' && selectedEmployee && (
        <Chip 
          label={`${selectedEmployee.name}로 매칭`} 
          size="small" 
          color="success" 
        />
      )}
    </Box>
  );
};