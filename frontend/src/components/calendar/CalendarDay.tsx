import React from 'react';
import { Box, Paper, Typography, Chip, Badge } from '@mui/material';
import { Today, Settings, Add } from '@mui/icons-material';
import { format, isWeekend } from 'date-fns';
import { CalendarDayProps } from '../../types/LeaveCalendarTypes';

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

export default CalendarDay;