import React from 'react';
import {
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
  Box,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { EventDetailsDialogProps, LeaveCalendarEvent } from '../../types/LeaveCalendarTypes';

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  open,
  date,
  events,
  onClose
}) => {
  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '연차';
      case 'sick': return '병가';
      case 'personal': return '개인 휴가';
      case 'family': return '가족 휴가';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {date && format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 휴가 현황
      </DialogTitle>
      <DialogContent>
        {events.length === 0 ? (
          <Alert severity="info">
            이 날짜에는 휴가 신청이 없습니다.
          </Alert>
        ) : (
          <List>
            {events.map((event, index) => (
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
                {index < events.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventDetailsDialog;