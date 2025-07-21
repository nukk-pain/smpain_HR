import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
  Umbrella,
  Calendar,
  Briefcase,
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
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
    <div
      className={`
        h-24 w-full p-2 cursor-pointer relative border rounded-lg
        ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
        ${isToday ? 'border-primary border-2' : exception ? 'border-orange-500 border-2' : 'border-border'}
        hover:bg-accent transition-colors
      `}
      onClick={handleClick}
    >
      <div className="flex justify-between items-center mb-1">
        <span
          className={`
            text-sm
            ${isToday ? 'font-bold' : 'font-normal'}
            ${isCurrentMonth
              ? isWeekendDay
                ? 'text-red-500'
                : 'text-foreground'
              : 'text-muted-foreground'
            }
          `}
        >
          {dayNumber}
        </span>
        <div className="flex items-center gap-1">
          {isToday && (
            <CalendarDays className="h-4 w-4 text-primary" />
          )}
          {exception && (
            <div className="relative">
              <Settings className="h-4 w-4 text-orange-500" />
              <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-orange-500 hover:bg-orange-500">
                {exception.maxConcurrentLeaves}
              </Badge>
            </div>
          )}
          {isManagementMode && !exception && (
            <Plus className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        {approvedEvents.slice(0, 2).map((event, index) => (
          <Badge
            key={index}
            variant={event.leaveType === 'annual' ? 'default' : 'secondary'}
            className={`
              text-xs h-5 justify-center
              ${event.leaveType === 'annual' 
                ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
              }
            `}
          >
            {event.userName ? event.userName.substring(0, 4) : '??'}
          </Badge>
        ))}
        {pendingEvents.slice(0, 1).map((event, index) => (
          <Badge
            key={`pending-${index}`}
            variant="outline"
            className="text-xs h-5 justify-center bg-gray-100 text-gray-600 hover:bg-gray-100"
          >
            {event.userName ? event.userName.substring(0, 4) : '??'}?
          </Badge>
        ))}
        {(approvedEvents.length + pendingEvents.length) > 3 && (
          <span className="text-xs text-muted-foreground">
            +{(approvedEvents.length + pendingEvents.length) - 3}
          </span>
        )}
      </div>
    </div>
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

  const loadLeaveExceptions = async () => {
    try {
      const monthString = format(currentDate, 'yyyy-MM');
      const response = await apiService.get(`/leave/exceptions?month=${monthString}`);
      setLeaveExceptions(response.data || []);
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
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          전체 직원 휴가 달력
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Management Mode Toggle - Only for admin/manager */}
          {hasManagementPermission && (
            <div className="flex items-center space-x-2">
              <Switch
                id="management-mode"
                checked={isManagementMode}
                onCheckedChange={setIsManagementMode}
              />
              <Label htmlFor="management-mode">관리 모드</Label>
            </div>
          )}
          
          {/* Department Filter */}
          <div className="min-w-32">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-48 text-center">
                {format(currentDate, 'yyyy년 MM월', { locale: ko })}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleToday}
              className="flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              오늘
            </Button>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Week Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <div key={index} className="flex justify-center p-2">
                    <span
                      className={`
                        text-sm font-bold
                        ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-foreground'}
                      `}
                    >
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => (
                  <div key={index} className="min-h-24">
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
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            범례
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                연차
              </Badge>
              <span className="text-sm">연차 휴가</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                기타
              </Badge>
              <span className="text-sm">기타 휴가</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                대기?
              </Badge>
              <span className="text-sm">승인 대기</span>
            </div>
            {hasManagementPermission && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Settings className="h-4 w-4 text-orange-500" />
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-orange-500 hover:bg-orange-500">
                    2
                  </Badge>
                </div>
                <span className="text-sm">복수 휴가 허용 (숫자: 최대 인원)</span>
              </div>
            )}
            {isManagementMode && (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">클릭하여 예외 설정 추가</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 휴가 현황
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {selectedEvents.length === 0 ? (
              <Alert>
                <AlertDescription>
                  이 날짜에는 휴가 신청이 없습니다.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {selectedEvents.map((event, index) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {event.userName || '알 수 없음'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({event.userDepartment || '부서 없음'})
                          </span>
                          <Badge
                            className={`${getStatusColor(event.status)} hover:${getStatusColor(event.status)}`}
                          >
                            {getStatusLabel(event.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getLeaveTypeLabel(event.leaveType)} • {event.daysCount}일
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.startDate && event.endDate ? 
                            `${format(new Date(event.startDate), 'MM/dd')} ~ ${format(new Date(event.endDate), 'MM/dd')}` : 
                            '날짜 정보 없음'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">
                          사유: {event.reason || '사유 없음'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exception Management Dialog */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedExceptionDate && format(selectedExceptionDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 예외 설정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="max-leaves">최대 동시 휴가 허용 인원</Label>
              <Input
                id="max-leaves"
                type="number"
                value={exceptionForm.maxConcurrentLeaves}
                onChange={(e) => setExceptionForm({
                  ...exceptionForm,
                  maxConcurrentLeaves: parseInt(e.target.value) || 2
                })}
                min={2}
                max={10}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                2명 이상의 직원이 동시에 휴가를 신청할 수 있습니다.
              </p>
            </div>
            <div>
              <Label htmlFor="reason">설정 사유 (선택사항)</Label>
              <textarea
                id="reason"
                rows={3}
                value={exceptionForm.reason}
                onChange={(e) => setExceptionForm({
                  ...exceptionForm,
                  reason: e.target.value
                })}
                placeholder="예: 연말연시, 회사 휴무일, 특별 행사일 등"
                className="mt-1 w-full p-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            {selectedExceptionDate && leaveExceptions.find(ex => 
              ex.date === format(selectedExceptionDate, 'yyyy-MM-dd')
            ) && (
              <Button 
                onClick={handleDeleteException} 
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            )}
            <Button 
              onClick={() => setExceptionDialogOpen(false)}
              variant="outline"
            >
              취소
            </Button>
            <Button onClick={handleSaveException}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveCalendar;