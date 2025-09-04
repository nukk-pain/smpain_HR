import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday
}) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={onPreviousMonth}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
          {format(currentDate, 'yyyy년 MM월', { locale: ko })}
        </Typography>
        <IconButton onClick={onNextMonth}>
          <ChevronRight />
        </IconButton>
      </Box>
      <Button
        variant="outlined"
        startIcon={<Today />}
        onClick={onToday}
      >
        오늘
      </Button>
    </Box>
  );
};

export default CalendarHeader;