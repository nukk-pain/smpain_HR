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
  CircularProgress
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Person,
  BeachAccess,
  Event,
  Work
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

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: LeaveCalendarEvent[];
  onClick: (date: Date, events: LeaveCalendarEvent[]) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  isCurrentMonth,
  isToday,
  events,
  onClick
}) => {
  const dayNumber = format(date, 'd');
  const isWeekendDay = isWeekend(date);
  const approvedEvents = events.filter(e => e.status === 'approved');
  const pendingEvents = events.filter(e => e.status === 'pending');

  return (
    <Paper
      sx={{
        height: 100,
        p: 1,
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: isCurrentMonth ? 'background.paper' : 'background.default',
        border: isToday ? '2px solid primary.main' : '1px solid divider',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
      onClick={() => onClick(date, events)}
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
        {isToday && (
          <Today fontSize="small" color="primary" />
        )}
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {approvedEvents.slice(0, 2).map((event, index) => (
          <Chip
            key={index}
            label={event.userName ? event.userName.substring(0, 2) : '??'}
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
            label={`${event.userName ? event.userName.substring(0, 2) : '??'}?`}
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
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<LeaveCalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, departmentFilter]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const monthString = format(currentDate, 'yyyy-MM');
      
      // 항상 전체 직원 달력 로드 (팀 달력)
      const response = await apiService.get(`/leave/team-calendar/${monthString}`, {
        department: departmentFilter !== 'all' ? departmentFilter : undefined
      });
      
      setCalendarEvents(response.data || []);
      
      // Extract unique departments for filter
      const uniqueDepartments = [...new Set(response.data?.map((event: LeaveCalendarEvent) => event.userDepartment) || [])];
      setDepartments(uniqueDepartments);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
      showError('달력 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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
    return calendarEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return date >= eventStart && date <= eventEnd;
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          전체 직원 휴가 달력
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <Grid item xs={12/7} key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 'bold',
                        color: index === 0 ? 'error.main' : index === 6 ? 'primary.main' : 'text.primary'
                      }}
                    >
                      {day}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Days */}
              <Grid container spacing={1}>
                {calendarDays.map((date, index) => (
                  <Grid item xs={12/7} key={index} sx={{ display: 'flex', minHeight: 100 }}>
                    <CalendarDay
                      date={date}
                      isCurrentMonth={isSameMonth(date, currentDate)}
                      isToday={isSameDay(date, new Date())}
                      events={getEventsForDate(date)}
                      onClick={handleDateClick}
                    />
                  </Grid>
                ))}
              </Grid>
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
    </Box>
  );
};

export default LeaveCalendar;