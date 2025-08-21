import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { FilterOptions } from '@/types/UnifiedLeaveOverviewTypes';

interface UnifiedLeaveOverviewFiltersProps {
  filters: FilterOptions;
  departments: string[];
  currentYear: number;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onYearChange: (value: number) => void;
  onSortChange?: (value: string) => void;
  showSortOptions?: boolean;
  employeeCount?: number;
}

const UnifiedLeaveOverviewFilters: React.FC<UnifiedLeaveOverviewFiltersProps> = ({
  filters,
  departments,
  currentYear,
  onSearchChange,
  onDepartmentChange,
  onYearChange,
  onSortChange,
  showSortOptions = false,
  employeeCount
}) => {
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleDepartmentChange = (event: SelectChangeEvent) => {
    onDepartmentChange(event.target.value);
  };

  const handleYearChange = (event: SelectChangeEvent) => {
    onYearChange(Number(event.target.value));
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    if (onSortChange) {
      onSortChange(event.target.value);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search Field */}
      <TextField
        size="small"
        placeholder="이름 또는 부서 검색"
        value={filters.searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 200 }}
      />

      {/* Department Filter */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>부서</InputLabel>
        <Select
          value={filters.selectedDepartment}
          onChange={handleDepartmentChange}
          label="부서"
        >
          <MenuItem value="all">전체</MenuItem>
          {departments.map((dept) => (
            <MenuItem key={dept} value={dept}>
              {dept}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Year Filter */}
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>연도</InputLabel>
        <Select
          value={filters.selectedYear.toString()}
          onChange={handleYearChange}
          label="연도"
        >
          {years.map((year) => (
            <MenuItem key={year} value={year.toString()}>
              {year}년
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sort Options (Admin only) */}
      {showSortOptions && onSortChange && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>정렬</InputLabel>
          <Select
            value={filters.sortBy}
            onChange={handleSortChange}
            label="정렬"
          >
            <MenuItem value="name">이름순</MenuItem>
            <MenuItem value="department">부서순</MenuItem>
            <MenuItem value="usage">사용률순</MenuItem>
            <MenuItem value="remaining">잔여일순</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Result Count */}
      {employeeCount !== undefined && (
        <Chip 
          label={`${employeeCount}명`} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      )}
    </Box>
  );
};

export default UnifiedLeaveOverviewFilters;