import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay } from 'date-fns';
import CalendarDay from './CalendarDay';
import { LeaveCalendarEvent, LeaveException } from '../../types/LeaveCalendarTypes';

interface CalendarGridProps {
  currentDate: Date;
  calendarEvents: LeaveCalendarEvent[];
  leaveExceptions: LeaveException[];
  loading: boolean;
  isManagementMode: boolean;
  onDateClick: (date: Date, events: LeaveCalendarEvent[]) => void;
  onManagementClick: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  calendarEvents,
  leaveExceptions,
  loading,
  isManagementMode,
  onDateClick,
  onManagementClick
}) => {
  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start from Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => {
      const eventStartDate = event.startDate;
      const eventEndDate = event.endDate;
      return dateString >= eventStartDate && dateString <= eventEndDate;
    });
  };

  const getExceptionForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return leaveExceptions.find(exception => exception.date === dateString);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
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
              onClick={onDateClick}
              onManagementClick={onManagementClick}
            />
          </Box>
        ))}
      </Box>
    </>
  );
};

export default CalendarGrid;