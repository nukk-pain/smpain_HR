/**
 * UserList Component
 * 
 * Provides optimized user list display functionality with sorting, actions, and virtualization.
 * Extracted from UserManagement component to follow SRP with performance enhancements.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  CircularProgress,
  TableSortLabel,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  PersonOutline,
  MoreVert
} from '@mui/icons-material';
import { User } from '../types';
import { SortField, SortOrder } from '../hooks/useUserFilters';

// Component props interface with optimization
export interface UserListProps {
  users: readonly User[];
  loading?: boolean;
  selectedUser?: User | null;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  currentUser: User;
  onUserSelect: (user: User) => void;
  onUserEdit: (user: User) => void;
  onUserDelete: (user: User) => void;
  onUserView: (user: User) => void;
  onSort?: (field: SortField) => void;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  canView: (user: User) => boolean;
  virtualized?: boolean;
  maxHeight?: number;
  emptyMessage?: string;
  error?: string;
}

// Memoized constants for performance
const ROLE_NAMES = Object.freeze({
  admin: '관리자',
  supervisor: '팀장',
  user: '사용자'
}) as const;

// Column definitions with responsive behavior
interface ColumnDefinition {
  id: SortField | 'actions';
  label: string;
  sortable: boolean;
  responsive?: 'mobile' | 'tablet' | 'desktop';
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
}

const COLUMNS: readonly ColumnDefinition[] = Object.freeze([
  { id: 'username' as SortField, label: '사용자명', sortable: true, responsive: 'tablet', minWidth: 120 },
  { id: 'name' as SortField, label: '이름', sortable: true, minWidth: 100 },
  { id: 'role' as SortField, label: '역할', sortable: true, minWidth: 80 },
  { id: 'department' as SortField, label: '부서', sortable: true, responsive: 'tablet', minWidth: 100 },
  { id: 'position' as SortField, label: '직책', sortable: false, responsive: 'desktop', minWidth: 100 },
  { id: 'status' as SortField, label: '상태', sortable: true, minWidth: 80, align: 'center' },
  { id: 'actions', label: '작업', sortable: false, minWidth: 120, align: 'center' }
]) as const;

// Row height for virtualization
const ROW_HEIGHT = 73;
const HEADER_HEIGHT = 56;

/**
 * Optimized UserList component with React.memo and performance enhancements
 */
export const UserList: React.FC<UserListProps> = memo(({
  users,
  loading = false,
  selectedUser,
  sortBy,
  sortOrder,
  currentUser,
  onUserSelect,
  onUserEdit,
  onUserDelete,
  onUserView,
  onSort,
  canEdit,
  canDelete,
  canView,
  virtualized = false,
  maxHeight = 600,
  emptyMessage = '등록된 사용자가 없습니다',
  error
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Memoized event handlers to prevent unnecessary re-renders
  const handleRowClick = useCallback((user: User) => {
    onUserSelect(user);
  }, [onUserSelect]);

  const handleSort = useCallback((field: SortField) => {
    if (onSort) {
      onSort(field);
    }
  }, [onSort]);

  const handleActionClick = useCallback((e: React.MouseEvent, action: 'view' | 'edit' | 'delete', user: User) => {
    e.stopPropagation();
    switch (action) {
      case 'view':
        onUserView(user);
        break;
      case 'edit':
        onUserEdit(user);
        break;
      case 'delete':
        onUserDelete(user);
        break;
    }
  }, [onUserView, onUserEdit, onUserDelete]);

  // Memoized helper functions
  const isSelected = useCallback((user: User) => {
    return selectedUser?._id === user._id;
  }, [selectedUser]);

  const getRoleDisplayName = useCallback((role: string) => {
    return ROLE_NAMES[role as keyof typeof ROLE_NAMES] || role;
  }, []);

  const getStatusChip = useCallback((isActive: boolean) => {
    return (
      <Chip
        label={isActive ? '활성' : '비활성'}
        color={isActive ? 'success' : 'error'}
        size="small"
        variant="outlined"
      />
    );
  }, []);

  // Responsive column filtering
  const visibleColumns = useMemo(() => {
    return COLUMNS.filter(column => {
      if (!column.responsive) return true;
      if (column.responsive === 'desktop' && (isMobile || isTablet)) return false;
      if (column.responsive === 'tablet' && isMobile) return false;
      return true;
    });
  }, [isMobile, isTablet]);

  // Performance optimization for large lists
  const displayUsers = useMemo(() => {
    if (!virtualized || users.length < 100) return users;
    // Simple virtualization - in production, use react-window or similar
    return users.slice(0, Math.min(users.length, 50));
  }, [users, virtualized]);

  // Loading skeleton
  const renderLoadingSkeleton = useMemo(() => (
    <TableBody>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {visibleColumns.map((column) => (
            <TableCell key={column.id}>
              <Skeleton variant="text" width="80%" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  ), [visibleColumns]);

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ maxHeight }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6" component="h2">
            사용자 목록
          </Typography>
        </Box>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell key={column.id} sx={{ fontWeight: 'bold' }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          {renderLoadingSkeleton}
        </Table>
      </TableContainer>
    );
  }

  // Empty state
  if (users.length === 0) {
    return (
      <Paper sx={{ minHeight: 300 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6" component="h2">
            사용자 목록
          </Typography>
        </Box>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="240px"
          p={3}
        >
          <PersonOutline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      aria-label="사용자 목록"
      sx={{ 
        maxHeight: virtualized ? maxHeight : 'none',
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <Box p={2} borderBottom={1} borderColor="divider">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="h2">
            사용자 목록
          </Typography>
          <Typography variant="body2" color="text.secondary">
            총 {users.length}명
          </Typography>
        </Box>
      </Box>
      
      <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                sortDirection={sortBy === column.id ? sortOrder : false}
                sx={{ 
                  fontWeight: 'bold',
                  minWidth: column.minWidth,
                  ...(column.align && { textAlign: column.align })
                }}
                align={column.align}
              >
                {column.sortable && onSort ? (
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortOrder : 'asc'}
                    onClick={() => handleSort(column.id as SortField)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        
        <TableBody>
          {displayUsers.map((user) => (
            <TableRow
              key={user._id}
              data-testid={`user-row-${user._id}`}
              onClick={() => handleRowClick(user)}
              selected={isSelected(user)}
              hover
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  backgroundColor: 'action.selected'
                },
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              className={isSelected(user) ? 'selected' : ''}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(user);
                }
              }}
              role="button"
              aria-pressed={isSelected(user)}
            >
              {visibleColumns.map((column) => {
                if (column.id === 'actions') {
                  return (
                    <TableCell key="actions" align="center">
                      <Box display="flex" gap={0.5} justifyContent="center">
                        <Tooltip title="사용자 보기">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleActionClick(e, 'view', user)}
                              disabled={!canView(user)}
                              aria-label="사용자 보기"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="사용자 수정">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleActionClick(e, 'edit', user)}
                              disabled={!canEdit(user)}
                              aria-label="사용자 수정"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="사용자 삭제">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleActionClick(e, 'delete', user)}
                              disabled={!canDelete(user)}
                              aria-label="사용자 삭제"
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  );
                }

                const align = column.align;
                let cellContent;
                
                switch (column.id) {
                  case 'username':
                    cellContent = user.username;
                    break;
                  case 'name':
                    cellContent = user.name;
                    break;
                  case 'role':
                    cellContent = getRoleDisplayName(user.role);
                    break;
                  case 'department':
                    cellContent = user.department || '-';
                    break;
                  case 'position':
                    cellContent = user.position || '-';
                    break;
                  case 'status':
                    cellContent = getStatusChip(user.isActive);
                    break;
                  default:
                    cellContent = '-';
                }

                return (
                  <TableCell key={column.id} align={align}>
                    {cellContent}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {virtualized && users.length > displayUsers.length && (
        <Box p={2} textAlign="center" borderTop={1} borderColor="divider">
          <Typography variant="body2" color="text.secondary">
            {displayUsers.length} / {users.length} 사용자 표시됨
          </Typography>
        </Box>
      )}
    </TableContainer>
  );
});

// Display name for debugging
UserList.displayName = 'UserList';