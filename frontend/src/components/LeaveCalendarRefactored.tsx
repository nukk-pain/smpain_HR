import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { format, addMonths, subMonths } from 'date-fns';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';
import { apiService } from '../services/api';
import { 
  LeaveCalendarEvent, 
  LeaveException, 
  ExceptionFormData,
  LeaveStatistics 
} from '../types/LeaveCalendarTypes';

// Import extracted components
import CalendarHeader from './calendar/CalendarHeader';
import CalendarGrid from './calendar/CalendarGrid';
import CalendarLegend from './calendar/CalendarLegend';
import EventDetailsDialog from './calendar/EventDetailsDialog';
import ExceptionDialog from './calendar/ExceptionDialog';

const LeaveCalendarRefactored: React.FC = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<LeaveCalendarEvent[]>([]);
  const [leaveExceptions, setLeaveExceptions] = useState<LeaveException[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<LeaveCalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Management mode states
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [selectedExceptionDate, setSelectedExceptionDate] = useState<Date | null>(null);
  const [exceptionForm, setExceptionForm] = useState<ExceptionFormData>({
    maxConcurrentLeaves: 2,
    reason: ''
  });

  // Check if user has management permissions
  const hasManagementPermission = user?.permissions?.includes('leave:manage') || user?.role === 'admin';

  useEffect(() => {
    loadCalendarData();
    if (isManagementMode) {
      loadLeaveExceptions();
    }
  }, [currentDate, departmentFilter, isManagementMode]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const monthString = format(currentDate, 'yyyy-MM');
      
      const response = await apiService.get(`/leave/team-calendar/${monthString}`, {
        department: departmentFilter !== 'all' ? departmentFilter : undefined
      });
      
      setCalendarEvents((response.data || []) as LeaveCalendarEvent[]);
      
      // Extract unique departments for filter
      const data = (response.data || []) as LeaveCalendarEvent[];
      const uniqueDepartments = [...new Set(data.map((event) => event.userDepartment))];
      setDepartments(uniqueDepartments);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
      showError('달력 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveExceptions = async () => {
    try {
      const monthString = format(currentDate, 'yyyy-MM');
      const response = await apiService.get(`/leave/exceptions?month=${monthString}`);
      setLeaveExceptions((response as any).data || []);
    } catch (error) {
      console.error('Error loading leave exceptions:', error);
      showError('예외 설정을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Date click handler
  const handleDateClick = (date: Date, events: LeaveCalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  // Management mode handlers
  const handleManagementClick = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const existingException = leaveExceptions.find(ex => ex.date === dateString);
    
    setSelectedExceptionDate(date);
    if (existingException) {
      setExceptionForm({
        maxConcurrentLeaves: existingException.maxConcurrentLeaves,
        reason: existingException.reason
      });
    } else {
      setExceptionForm({
        maxConcurrentLeaves: 2,
        reason: ''
      });
    }
    setExceptionDialogOpen(true);
  };

  const handleSaveException = async (data: ExceptionFormData) => {
    if (!selectedExceptionDate) return;
    
    try {
      const dateString = format(selectedExceptionDate, 'yyyy-MM-dd');
      const existingException = leaveExceptions.find(ex => ex.date === dateString);
      
      if (existingException) {
        await apiService.put(`/leave/exceptions/${existingException._id}`, {
          ...data,
          date: dateString
        });
        showSuccess('예외 설정이 업데이트되었습니다.');
      } else {
        await apiService.post('/leave/exceptions', {
          ...data,
          date: dateString
        });
        showSuccess('예외 설정이 추가되었습니다.');
      }
      
      await loadLeaveExceptions();
      setExceptionDialogOpen(false);
    } catch (error) {
      console.error('Error saving exception:', error);
      showError('예외 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteException = async () => {
    if (!selectedExceptionDate) return;
    
    try {
      const dateString = format(selectedExceptionDate, 'yyyy-MM-dd');
      const existingException = leaveExceptions.find(ex => ex.date === dateString);
      
      if (existingException) {
        await apiService.delete(`/leave/exceptions/${existingException._id}`);
        showSuccess('예외 설정이 삭제되었습니다.');
        await loadLeaveExceptions();
        setExceptionDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting exception:', error);
      showError('예외 설정 삭제 중 오류가 발생했습니다.');
    }
  };

  const getCurrentException = () => {
    if (!selectedExceptionDate) return undefined;
    const dateString = format(selectedExceptionDate, 'yyyy-MM-dd');
    return leaveExceptions.find(ex => ex.date === dateString);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          전체 직원 휴가 달력
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Management Mode Toggle */}
          {hasManagementPermission && (
            <FormControlLabel
              control={
                <Switch
                  checked={isManagementMode}
                  onChange={(e) => setIsManagementMode(e.target.checked)}
                  color="primary"
                />
              }
              label="관리 모드"
            />
          )}
          
          {/* Department Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>부서</InputLabel>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              label="부서"
            >
              <MenuItem value="all">전체</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Calendar Navigation and Grid */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <CalendarHeader
            currentDate={currentDate}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />
          
          <CalendarGrid
            currentDate={currentDate}
            calendarEvents={calendarEvents}
            leaveExceptions={leaveExceptions}
            loading={loading}
            isManagementMode={isManagementMode}
            onDateClick={handleDateClick}
            onManagementClick={handleManagementClick}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <CalendarLegend
        hasManagementPermission={hasManagementPermission}
        isManagementMode={isManagementMode}
      />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={dialogOpen}
        date={selectedDate}
        events={selectedEvents}
        onClose={handleCloseDialog}
      />

      {/* Exception Management Dialog */}
      <ExceptionDialog
        open={exceptionDialogOpen}
        date={selectedExceptionDate}
        formData={exceptionForm}
        existingException={getCurrentException()}
        onClose={() => setExceptionDialogOpen(false)}
        onSave={handleSaveException}
        onDelete={handleDeleteException}
        onFormChange={setExceptionForm}
      />
    </Box>
  );
};

export default LeaveCalendarRefactored;