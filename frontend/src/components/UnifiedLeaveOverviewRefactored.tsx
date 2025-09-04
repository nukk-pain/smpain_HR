import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard,
  Group,
  Business
} from '@mui/icons-material';
import { format } from 'date-fns';

// Components
import UnifiedLeaveOverviewFilters from '@/components/leave/UnifiedLeaveOverviewFilters';
import UnifiedLeaveOverviewTable from '@/components/leave/UnifiedLeaveOverviewTable';
import UnifiedLeaveOverviewExport from '@/components/leave/UnifiedLeaveOverviewExport';
import UnifiedLeaveOverviewStats from '@/components/leave/UnifiedLeaveOverviewStats';
import LeaveAdjustmentDialog from '@/components/LeaveAdjustmentDialog';
import LeaveAnalyticsCharts from '@/components/charts/LeaveAnalyticsCharts';
import MobileLeaveOverview from '@/components/MobileLeaveOverview';

// Hooks and Utils
import { useUnifiedLeaveData } from '@/hooks/useUnifiedLeaveData';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/components/NotificationProvider';
import { 
  UnifiedLeaveOverviewProps, 
  ViewMode 
} from '@/types/UnifiedLeaveOverviewTypes';
import { 
  getStatusColor, 
  getStatusLabel, 
  getLeaveTypeLabel 
} from '@/utils/leaveOverviewUtils';

/**
 * Refactored UnifiedLeaveOverview Component
 * Main component now acts as a coordinator, delegating specific responsibilities to sub-components
 */
const UnifiedLeaveOverview: React.FC<UnifiedLeaveOverviewProps> = ({
  userRole,
  initialViewMode = 'overview'
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null);

  // Use the custom hook for data management
  const {
    processedData,
    statistics,
    departments,
    viewMode,
    filters,
    selectedEmployee,
    detailDialogOpen,
    adjustmentDialogOpen,
    isLoading,
    handleViewModeChange,
    handleFilterChange,
    handleViewDetail,
    handleAdjustLeave,
    setDetailDialogOpen,
    setAdjustmentDialogOpen,
    refetchData,
    adjustmentMutation
  } = useUnifiedLeaveData({ userRole, initialViewMode });

  // View mode change handler
  const handleViewModeToggle = (
    event: React.MouseEvent<HTMLElement>,
    newMode: string | null
  ) => {
    if (newMode !== null) {
      handleViewModeChange(newMode as ViewMode);
    }
  };

  // Employee detail view handler
  const handleEmployeeDetail = async (employee: any) => {
    handleViewDetail(employee);
    // Fetch additional employee leave log if needed
    try {
      const response = await fetch(`/api/leave/employee/${employee.id}/log`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeLeaveLog(data);
        setEmployeeDetailOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch employee leave log:', error);
    }
  };

  // Adjustment completion handler
  const handleAdjustmentComplete = () => {
    setAdjustmentDialogOpen(false);
    refetchData();
    showSuccess('휴가 조정이 완료되었습니다');
  };

  // Mobile view
  if (isMobile) {
    return (
      <MobileLeaveOverview
        data={processedData.employees}
        userRole={userRole}
        onRefresh={refetchData}
      />
    );
  }

  // Render view mode selector for admin
  const renderViewModeSelector = () => {
    if (userRole !== 'admin') return null;

    return (
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewModeToggle}
        size="small"
      >
        <ToggleButton value="overview">
          <Dashboard sx={{ mr: 1 }} />
          전체 현황
        </ToggleButton>
        <ToggleButton value="team">
          <Group sx={{ mr: 1 }} />
          팀 현황
        </ToggleButton>
        <ToggleButton value="department">
          <Business sx={{ mr: 1 }} />
          부서별 통계
        </ToggleButton>
      </ToggleButtonGroup>
    );
  };

  // Render department statistics view
  const renderDepartmentView = () => {
    if (viewMode !== 'department' || processedData.departmentStats.length === 0) {
      return null;
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>부서명</TableCell>
              <TableCell align="center">전체 인원</TableCell>
              <TableCell align="center">평균 사용률</TableCell>
              <TableCell align="center">총 사용일</TableCell>
              <TableCell align="center">총 잔여일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processedData.departmentStats.map((dept) => (
              <TableRow key={dept.departmentName}>
                <TableCell>{dept.departmentName}</TableCell>
                <TableCell align="center">{dept.totalEmployees}명</TableCell>
                <TableCell align="center">{dept.averageUsage}%</TableCell>
                <TableCell align="center">{dept.totalUsed}일</TableCell>
                <TableCell align="center">{dept.totalRemaining}일</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          {viewMode === 'overview' ? '전체 휴가 현황' : 
           viewMode === 'team' ? '팀 휴가 현황' : 
           '부서별 휴가 통계'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {renderViewModeSelector()}
          <Button
            variant="outlined"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? '테이블 보기' : '차트 보기'}
          </Button>
          <UnifiedLeaveOverviewExport
            viewMode={viewMode}
            year={filters.selectedYear}
            department={filters.selectedDepartment === 'all' ? undefined : filters.selectedDepartment}
            onExportComplete={refetchData}
          />
        </Box>
      </Box>

      {/* Statistics Cards */}
      {viewMode !== 'department' && (
        <Box sx={{ mb: 3 }}>
          <UnifiedLeaveOverviewStats statistics={statistics} />
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <UnifiedLeaveOverviewFilters
          filters={filters}
          departments={departments}
          currentYear={new Date().getFullYear()}
          onSearchChange={(value) => handleFilterChange({ searchTerm: value })}
          onDepartmentChange={(value) => handleFilterChange({ selectedDepartment: value })}
          onYearChange={(value) => handleFilterChange({ selectedYear: value })}
          onSortChange={(value) => handleFilterChange({ sortBy: value })}
          showSortOptions={userRole === 'admin'}
          employeeCount={processedData.filteredCount}
        />
      </Box>

      {/* Main Content */}
      {showAnalytics ? (
        <LeaveAnalyticsCharts data={processedData.employees} />
      ) : viewMode === 'department' ? (
        renderDepartmentView()
      ) : (
        <UnifiedLeaveOverviewTable
          employees={processedData.employees}
          onViewDetail={handleEmployeeDetail}
          onAdjustLeave={handleAdjustLeave}
          isAdmin={userRole === 'admin'}
          loading={isLoading}
        />
      )}

      {/* Leave Adjustment Dialog */}
      {adjustmentDialogOpen && selectedEmployee && (
        <LeaveAdjustmentDialog
          open={adjustmentDialogOpen}
          onClose={() => setAdjustmentDialogOpen(false)}
          employee={selectedEmployee}
          onComplete={handleAdjustmentComplete}
        />
      )}

      {/* Employee Detail Dialog */}
      <Dialog
        open={employeeDetailOpen}
        onClose={() => setEmployeeDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {employeeLeaveLog && (
          <>
            <DialogTitle>
              {employeeLeaveLog.employeeName} - 휴가 상세 내역
            </DialogTitle>
            <DialogContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="총 연차"
                    secondary={`${employeeLeaveLog.totalAnnual}일`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="사용"
                    secondary={`${employeeLeaveLog.used}일`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="잔여"
                    secondary={`${employeeLeaveLog.remaining}일`}
                  />
                </ListItem>
              </List>

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                휴가 사용 내역
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>유형</TableCell>
                      <TableCell>시작일</TableCell>
                      <TableCell>종료일</TableCell>
                      <TableCell>일수</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeLeaveLog?.leaves?.map((leave: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{getLeaveTypeLabel(leave.type)}</TableCell>
                        <TableCell>{format(new Date(leave.startDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{format(new Date(leave.endDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(leave.status)}
                            color={getStatusColor(leave.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEmployeeDetailOpen(false)}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Team Member Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEmployee && (
          <>
            <DialogTitle>{selectedEmployee.name} 상세 정보</DialogTitle>
            <DialogContent>
              <List>
                <ListItem>
                  <ListItemText primary="부서" secondary={selectedEmployee.department} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="직급" secondary={selectedEmployee.position} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="연차 현황"
                    secondary={`${selectedEmployee.used} / ${selectedEmployee.annual}일 사용`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="잔여 연차"
                    secondary={`${selectedEmployee.remaining}일`}
                  />
                </ListItem>
                {selectedEmployee.pending > 0 && (
                  <ListItem>
                    <ListItemText
                      primary="대기중"
                      secondary={`${selectedEmployee.pending}일`}
                    />
                  </ListItem>
                )}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default UnifiedLeaveOverview;