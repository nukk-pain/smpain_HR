import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Chip,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Divider,
  Grid
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { TeamMember } from '../../../types/leave';

interface TeamStatusViewProps {
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
  departments: string[];
  teamMembers: TeamMember[];
  userRole: 'admin' | 'supervisor';
  handleMemberClick: (member: TeamMember) => void;
  handleViewDetail: (member: any) => void;
  getLeaveUsageColor: (percentage: number) => string;
}

const TeamStatusView: React.FC<TeamStatusViewProps> = ({
  selectedDepartment,
  setSelectedDepartment,
  selectedYear,
  setSelectedYear,
  departments,
  teamMembers,
  userRole,
  handleMemberClick,
  handleViewDetail,
  getLeaveUsageColor
}) => {
  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>부서 선택</InputLabel>
          <Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            label="부서 선택"
          >
            <MenuItem value="all">전체</MenuItem>
            {departments.map(dept => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          select
          label="연도"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 100 }}
        >
          {[2023, 2024, 2025].map(year => (
            <MenuItem key={year} value={year}>{year}년</MenuItem>
          ))}
        </TextField>
      </Box>

      {teamMembers.length === 0 ? (
        <Alert severity="info">선택한 조건에 해당하는 팀원이 없습니다.</Alert>
      ) : (
        <Grid container spacing={3}>
          {teamMembers.map((member) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={member._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2 }}>
                      <Person />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{member.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {member.position} · {member.department}
                      </Typography>
                    </Box>
                    <Chip
                      label={member.currentStatus === 'on_leave' ? '휴가중' : '근무중'}
                      color={member.currentStatus === 'on_leave' ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      연차 사용 현황
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(member.leaveBalance.used / member.leaveBalance.annual) * 100}
                      color={getLeaveUsageColor((member.leaveBalance.used / member.leaveBalance.annual) * 100) as any}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        사용: {member.leaveBalance.used}일
                      </Typography>
                      <Typography variant="body2">
                        잔여: {member.leaveBalance.remaining}일
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      onClick={() => handleMemberClick(member)}
                    >
                      상세보기
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        size="small"
                        onClick={() => handleViewDetail(member)}
                      >
                        휴가 내역
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
};

export default TeamStatusView;