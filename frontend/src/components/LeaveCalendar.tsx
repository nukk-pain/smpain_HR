import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  TextField,
  Badge
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Person,
  BeachAccess,
  Event,
  Work,
  Settings,
  Add,
  Edit,
  Delete
} from '@mui/icons-material';
import { format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  isWeekend
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';
import { apiService } from '../services/api';
import { LeaveRequest } from '../types';

interface LeaveCalendarEvent {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'family';
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

interface LeaveException {
  _id?: string;
  date: string;
  maxConcurrentLeaves: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: LeaveCalendarEvent[];
  exception?: LeaveException;
  isManagementMode: boolean;
  onClick: (date: Date, events: LeaveCalendarEvent[]) => void;
  onManagementClick?: (date: Date) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  isCurrentMonth,
  isToday,
  events,
  exception,
  isManagementMode,
  onClick,
  onManagementClick
}) => {
  const dayNumber = format(date, 'd');
  const isWeekendDay = isWeekend(date);
  const approvedEvents = events.filter(e => e.status === 'approved');
  const pendingEvents = events.filter(e => e.status === 'pending');

  const handleClick = () => {
    if (isManagementMode && onManagementClick) {
      onManagementClick(date);
    } else {
      onClick(date, events);
    }
  };

  return (
    <Paper
      sx={{
        height: 100,
        width: '100%',
        p: 1,
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: isCurrentMonth ? 'background.paper' : 'background.default',
        border: isToday ? '2px solid primary.main' : 
                exception ? '2px solid orange' : '1px solid divider',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
      onClick={handleClick}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: isToday ? 'bold' : 'normal',
            color: isCurrentMonth
              ? isWeekendDay
                ? 'error.main'
                : 'text.primary'
              : 'text.disabled'
          }}
        >
          {dayNumber}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isToday && (
            <Today fontSize="small" color="primary" />
          )}
          {exception && (
            <Badge badgeContent={exception.maxConcurrentLeaves} color="warning">
              <Settings fontSize="small" color="warning" />
            </Badge>
          )}
          {isManagementMode && !exception && (
            <Add fontSize="small" color="action" />
          )}
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {approvedEvents.slice(0, 2).map((event, index) => (
          <Chip
            key={index}
            label={event.userName ? event.userName.substring(0, 4) : '??'}
            size="small"
            sx={{
              fontSize: '0.7rem',
              height: 20,
              backgroundColor: event.leaveType === 'annual' ? 'success.light' : 'warning.light',
              color: event.leaveType === 'annual' ? 'success.contrastText' : 'warning.contrastText'
            }}
          />
        ))}
        {pendingEvents.slice(0, 1).map((event, index) => (
          <Chip
            key={`pending-${index}`}
            label={`${event.userName ? event.userName.substring(0, 4) : '??'}?`}
            size="small"
            sx={{
              fontSize: '0.7rem',
              height: 20,
              backgroundColor: 'grey.300',
              color: 'text.primary'
            }}
          />
        ))}
        {(approvedEvents.length + pendingEvents.length) > 3 && (
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            +{(approvedEvents.length + pendingEvents.length) - 3}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const LeaveCalendar: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
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
  const [exceptionForm, setExceptionForm] = useState({
    maxConcurrentLeaves: 2,
    reason: ''
  });

  useEffect(() => {
    loadCalendarData();
    if (isManagementMode) {
      loadLeaveExceptions();
    }
  }, [currentDate, departmentFilter, isManagementMode]);

  // Check if user has management permissions
  const hasManagementPermission = user?.permissions?.includes('leave:manage') || user?.role === 'admin';

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const monthString = format(currentDate, 'yyyy-MM');
      
      // 항상 전체 직원 달력 로드 (팀 달력)
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

  const handleSaveException = async () => {
    if (!selectedExceptionDate) return;

    try {
      const dateString = format(selectedExceptionDate, 'yyyy-MM-dd');
      const existingException = leaveExceptions.find(ex => ex.date === dateString);

      if (existingException) {
        // Update existing exception
        await apiService.put(`/leave/exceptions/${existingException._id}`, exceptionForm);
      } else {
        // Create new exception
        await apiService.post('/leave/exceptions', {
          date: dateString,
          ...exceptionForm
        });
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
        await loadLeaveExceptions();
        setExceptionDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting exception:', error);
      showError('예외 설정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

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

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연차';
      case 'sick':
        return '병가';
      case 'personal':
        return '개인휴가';
      case 'family':
        return '경조사';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start from Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const filteredEvents = calendarEvents.filter(event => {
      // Use date strings for comparison to avoid timezone issues
      const eventStartDate = event.startDate;
      const eventEndDate = event.endDate;
      
      // Check if the date falls within the event range
      const isMatch = dateString >= eventStartDate && dateString <= eventEndDate;
      
      return isMatch;
    });
    
    return filteredEvents;
  };

  const getExceptionForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return leaveExceptions.find(exception => exception.date === dateString);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          전체 직원 휴가 달력
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Management Mode Toggle - Only for admin/manager */}
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

      {/* Calendar Navigation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handlePreviousMonth}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                {format(currentDate, 'yyyy년 MM월', { locale: ko })}
              </Typography>
              <IconButton onClick={handleNextMonth}>
                <ChevronRight />
              </IconButton>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={handleToday}
            >
              오늘
            </Button>
          </Box>

          {/* Calendar Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Week Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 'bold',
                        color: index === 0 ? 'error.main' : index === 6 ? 'primary.main' : 'text.primary'
                      }}
                    >
                      {day}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Calendar Days */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {calendarDays.map((date, index) => (
                  <Box key={index} sx={{ minHeight: 100 }}>
                    <CalendarDay
                      date={date}
                      isCurrentMonth={isSameMonth(date, currentDate)}
                      isToday={isSameDay(date, new Date())}
                      events={getEventsForDate(date)}
                      exception={getExceptionForDate(date)}
                      isManagementMode={isManagementMode}
                      onClick={handleDateClick}
                      onManagementClick={handleManagementClick}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            범례
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="연차"
                size="small"
                sx={{ backgroundColor: 'success.light', color: 'success.contrastText' }}
              />
              <Typography variant="body2">연차 휴가</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="기타"
                size="small"
                sx={{ backgroundColor: 'warning.light', color: 'warning.contrastText' }}
              />
              <Typography variant="body2">기타 휴가</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="대기?"
                size="small"
                sx={{ backgroundColor: 'grey.300', color: 'text.primary' }}
              />
              <Typography variant="body2">승인 대기</Typography>
            </Box>
            {hasManagementPermission && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent="2" color="warning">
                  <Settings fontSize="small" color="warning" />
                </Badge>
                <Typography variant="body2">복수 휴가 허용 (숫자: 최대 인원)</Typography>
              </Box>
            )}
            {isManagementMode && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Add fontSize="small" color="action" />
                <Typography variant="body2">클릭하여 예외 설정 추가</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDate && format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 휴가 현황
        </DialogTitle>
        <DialogContent>
          {selectedEvents.length === 0 ? (
            <Alert severity="info">
              이 날짜에는 휴가 신청이 없습니다.
            </Alert>
          ) : (
            <List>
              {selectedEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {event.userName || '알 수 없음'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ({event.userDepartment || '부서 없음'})
                          </Typography>
                          <Chip
                            label={getStatusLabel(event.status)}
                            size="small"
                            color={getStatusColor(event.status) as any}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {getLeaveTypeLabel(event.leaveType)} • {event.daysCount}일
                          </Typography>
                          <Typography variant="body2">
                            {event.startDate && event.endDate ? 
                              `${format(new Date(event.startDate), 'MM/dd')} ~ ${format(new Date(event.endDate), 'MM/dd')}` : 
                              '날짜 정보 없음'
                            }
                          </Typography>
                          <Typography variant="body2">
                            사유: {event.reason || '사유 없음'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < selectedEvents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Exception Management Dialog */}
      <Dialog
        open={exceptionDialogOpen}
        onClose={() => setExceptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedExceptionDate && format(selectedExceptionDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 예외 설정
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="최대 동시 휴가 허용 인원"
              type="number"
              value={exceptionForm.maxConcurrentLeaves}
              onChange={(e) => setExceptionForm({
                ...exceptionForm,
                maxConcurrentLeaves: parseInt(e.target.value) || 2
              })}
              inputProps={{ min: 2, max: 10 }}
              sx={{ mb: 2 }}
              helperText="2명 이상의 직원이 동시에 휴가를 신청할 수 있습니다."
            />
            <TextField
              fullWidth
              label="설정 사유 (선택사항)"
              multiline
              rows={3}
              value={exceptionForm.reason}
              onChange={(e) => setExceptionForm({
                ...exceptionForm,
                reason: e.target.value
              })}
              placeholder="예: 연말연시, 회사 휴무일, 특별 행사일 등"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {selectedExceptionDate && leaveExceptions.find(ex => 
            ex.date === format(selectedExceptionDate, 'yyyy-MM-dd')
          ) && (
            <Button onClick={handleDeleteException} color="error" startIcon={<Delete />}>
              삭제
            </Button>
          )}
          <Button onClick={() => setExceptionDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSaveException} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveCalendar;