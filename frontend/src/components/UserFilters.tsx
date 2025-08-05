/**
 * UserFilters Component
 * 
 * Provides optimized filtering and sorting controls for user lists.
 * Extracted from UserManagement component to follow SRP with performance optimizations.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Badge,
  Button,
  Grid,
  Paper,
  Tooltip,
  Chip
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  FilterList,
  Clear,
  Search,
  Sort
} from '@mui/icons-material';
import { UserFilters as UserFiltersType, SortField, SortOrder } from '../hooks/useUserFilters';

// Component props interface with performance optimization
export interface UserFiltersProps {
  searchTerm: string;
  filters: UserFiltersType;
  departments: readonly string[];
  roles: readonly string[];
  sortBy: SortField;
  sortOrder: SortOrder;
  loading?: boolean;
  totalCount: number;
  filteredCount: number;
  onSearch: (search: string) => void;
  onFiltersChange: (key: string, value: string) => void;
  onSort: (field: SortField) => void;
  onClearFilters: () => void;
}

// Constants memoized for performance
const ROLE_NAMES = Object.freeze({
  admin: '관리자',
  supervisor: '팀장',
  user: '사용자'
}) as const;

const STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' }
]) as const;

const SORT_FIELD_OPTIONS = Object.freeze([
  { value: 'id' as SortField, label: 'ID' },
  { value: 'name' as SortField, label: '이름' },
  { value: 'username' as SortField, label: '사용자명' },
  { value: 'department' as SortField, label: '부서' },
  { value: 'role' as SortField, label: '역할' },
  { value: 'status' as SortField, label: '상태' },
  { value: 'email' as SortField, label: '이메일' },
  { value: 'position' as SortField, label: '직책' }
]) as const;

/**
 * Optimized UserFilters component with React.memo and performance enhancements
 */
export const UserFilters: React.FC<UserFiltersProps> = memo(({
  searchTerm,
  filters,
  departments,
  roles,
  sortBy,
  sortOrder,
  loading = false,
  totalCount,
  filteredCount,
  onSearch,
  onFiltersChange,
  onSort,
  onClearFilters
}) => {
  // Memoized event handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value);
  }, [onSearch]);

  const handleDepartmentChange = useCallback((event: any) => {
    onFiltersChange('department', event.target.value);
  }, [onFiltersChange]);

  const handleRoleChange = useCallback((event: any) => {
    onFiltersChange('role', event.target.value);
  }, [onFiltersChange]);

  const handleStatusChange = useCallback((event: any) => {
    onFiltersChange('status', event.target.value);
  }, [onFiltersChange]);

  const handleSortByChange = useCallback((event: any) => {
    onSort(event.target.value as SortField);
  }, [onSort]);

  const handleSortOrderToggle = useCallback(() => {
    onSort(sortBy); // Toggle logic handled by parent
  }, [sortBy, onSort]);

  // Memoized department options
  const departmentOptions = useMemo(() => (
    departments.map((dept) => (
      <MenuItem key={dept} value={dept}>
        {dept}
      </MenuItem>
    ))
  ), [departments]);

  // Memoized role options
  const roleOptions = useMemo(() => (
    roles.map((role) => (
      <MenuItem key={role} value={role}>
        {ROLE_NAMES[role as keyof typeof ROLE_NAMES] || role}
      </MenuItem>
    ))
  ), [roles]);

  // Memoized status options
  const statusMenuItems = useMemo(() => (
    STATUS_OPTIONS.map(({ value, label }) => (
      <MenuItem key={value} value={value}>
        {label}
      </MenuItem>
    ))
  ), []);

  // Memoized sort field options
  const sortFieldMenuItems = useMemo(() => (
    SORT_FIELD_OPTIONS.map(({ value, label }) => (
      <MenuItem key={value} value={value}>
        {label}
      </MenuItem>
    ))
  ), []);

  // Computed sort order tooltip
  const sortOrderTooltip = useMemo(() => (
    `정렬 순서: ${sortOrder === 'asc' ? '오름차순' : '내림차순'}`
  ), [sortOrder]);

  // Computed values for UI state
  const hasActiveFilters = useMemo(() => (
    filters.search || filters.department || filters.role || filters.status !== 'all'
  ), [filters]);
  
  const isFiltering = loading;
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.department) count++;
    if (filters.role) count++;
    if (filters.status !== 'all') count++;
    return count;
  }, [filters]);

  // Active filter chips for better UX
  const activeFilterChips = useMemo(() => {
    const chips: React.ReactElement[] = [];
    
    if (filters.search) {
      chips.push(
        <Chip
          key="search"
          size="small"
          label={`검색: ${filters.search}`}
          onDelete={() => onSearch('')}
          color="primary"
          variant="outlined"
        />
      );
    }
    
    if (filters.department) {
      chips.push(
        <Chip
          key="department"
          size="small"
          label={`부서: ${filters.department}`}
          onDelete={() => onFiltersChange('department', '')}
          color="primary"
          variant="outlined"
        />
      );
    }
    
    if (filters.role) {
      chips.push(
        <Chip
          key="role"
          size="small"
          label={`역할: ${ROLE_NAMES[filters.role as keyof typeof ROLE_NAMES] || filters.role}`}
          onDelete={() => onFiltersChange('role', '')}
          color="primary"
          variant="outlined"
        />
      );
    }
    
    if (filters.status !== 'all') {
      const statusLabel = STATUS_OPTIONS.find(opt => opt.value === filters.status)?.label || filters.status;
      chips.push(
        <Chip
          key="status"
          size="small"
          label={`상태: ${statusLabel}`}
          onDelete={() => onFiltersChange('status', 'all')}
          color="primary"
          variant="outlined"
        />
      );
    }
    
    return chips;
  }, [filters, onSearch, onFiltersChange]);
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      {/* Filter Controls */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: hasActiveFilters ? 2 : 0 }}>
        {/* Search Field */}
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="사용자 검색..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isFiltering}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
            }}
            sx={{
              '& .MuiInputBase-input': {
                transition: 'all 0.2s ease-in-out'
              }
            }}
          />
        </Grid>

        {/* Department Filter */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="department-filter-label">부서</InputLabel>
            <Select
              labelId="department-filter-label"
              label="부서"
              value={filters.department}
              onChange={handleDepartmentChange}
              disabled={isFiltering}
            >
              <MenuItem value="">전체</MenuItem>
              {departmentOptions}
            </Select>
          </FormControl>
        </Grid>

        {/* Role Filter */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="role-filter-label">역할</InputLabel>
            <Select
              labelId="role-filter-label"
              label="역할"
              value={filters.role}
              onChange={handleRoleChange}
              disabled={isFiltering}
            >
              <MenuItem value="">전체</MenuItem>
              {roleOptions}
            </Select>
          </FormControl>
        </Grid>

        {/* Status Filter */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="status-filter-label">상태</InputLabel>
            <Select
              labelId="status-filter-label"
              label="상태"
              value={filters.status}
              onChange={handleStatusChange}
              disabled={isFiltering}
            >
              {statusMenuItems}
            </Select>
          </FormControl>
        </Grid>

        {/* Sort Controls */}
        <Grid item xs={12} md={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-by-label">정렬 기준</InputLabel>
              <Select
                labelId="sort-by-label"
                label="정렬 기준"
                value={sortBy}
                onChange={handleSortByChange}
                disabled={isFiltering}
                startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} />}
              >
                {sortFieldMenuItems}
              </Select>
            </FormControl>
            <Tooltip title={sortOrderTooltip}>
              <IconButton
                size="small"
                onClick={handleSortOrderToggle}
                disabled={isFiltering}
                aria-label="정렬 순서 변경"
                sx={{
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUpward data-testid="sort-asc-icon" />
                ) : (
                  <ArrowDownward data-testid="sort-desc-icon" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>

        {/* Reset Button */}
        <Grid item xs={12} md={1}>
          <Box display="flex" justifyContent="center">
            {hasActiveFilters && (
              <Tooltip title="모든 필터 초기화">
                <Badge badgeContent={activeFilterCount} color="primary">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Clear />}
                    onClick={onClearFilters}
                    disabled={isFiltering}
                    aria-label="필터 초기화"
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
                    }}
                  >
                    초기화
                  </Button>
                </Badge>
              </Tooltip>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
          {activeFilterChips}
        </Box>
      )}
    </Paper>
  );
});

// Display name for debugging
UserFilters.displayName = 'UserFilters';