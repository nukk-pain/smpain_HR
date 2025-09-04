import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Badge } from '@mui/material';
import { Settings, Add } from '@mui/icons-material';

interface CalendarLegendProps {
  hasManagementPermission: boolean;
  isManagementMode: boolean;
}

const CalendarLegend: React.FC<CalendarLegendProps> = ({
  hasManagementPermission,
  isManagementMode
}) => {
  return (
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
  );
};

export default CalendarLegend;