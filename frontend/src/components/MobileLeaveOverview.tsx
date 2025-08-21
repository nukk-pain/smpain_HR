import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Fab,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
  Button,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Download as DownloadIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

interface Employee {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  usageRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface MobileLeaveOverviewProps {
  employees?: Employee[];
  isLoading?: boolean;
}

const MobileLeaveOverview: React.FC<MobileLeaveOverviewProps> = ({
  employees = [],
  isLoading = false
}) => {
  const theme = useTheme();
  const { showSuccess, showError } = useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    const matchesRisk = selectedRiskLevel === 'all' || emp.riskLevel === selectedRiskLevel;
    
    return matchesSearch && matchesDepartment && matchesRisk;
  });

  const handleExpandClick = (employeeId: string) => {
    setExpandedId(expandedId === employeeId ? null : employeeId);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high': return '높음';
      case 'medium': return '중간';
      case 'low': return '낮음';
      default: return level;
    }
  };

  const handleExportExcel = async () => {
    try {
      showSuccess('Excel 파일을 생성중입니다...');
      await apiService.exportLeaveToExcel({
        view: 'overview',
        year: new Date().getFullYear(),
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        riskLevel: selectedRiskLevel !== 'all' ? selectedRiskLevel : undefined
      });
      showSuccess('Excel 파일이 다운로드되었습니다.');
    } catch (error) {
      showError('Excel 내보내기에 실패했습니다.');
    }
  };

  // Get unique departments
  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  // Calculate summary statistics
  const stats = {
    total: filteredEmployees.length,
    highRisk: filteredEmployees.filter(e => e.riskLevel === 'high').length,
    avgUsage: filteredEmployees.length > 0 
      ? Math.round(filteredEmployees.reduce((sum, e) => sum + e.usageRate, 0) / filteredEmployees.length)
      : 0
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header with Search */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="직원 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setFilterDrawerOpen(true)}>
                    <Badge badgeContent={selectedDepartment !== 'all' || selectedRiskLevel !== 'all' ? '!' : 0} color="primary">
                      <FilterIcon />
                    </Badge>
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Summary Stats */}
        <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-around' }}>
          <Box textAlign="center">
            <Typography variant="h6">{stats.total}</Typography>
            <Typography variant="caption" color="textSecondary">전체</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box textAlign="center">
            <Typography variant="h6" color="error">{stats.highRisk}</Typography>
            <Typography variant="caption" color="textSecondary">고위험</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box textAlign="center">
            <Typography variant="h6" color="primary">{stats.avgUsage}%</Typography>
            <Typography variant="caption" color="textSecondary">평균사용률</Typography>
          </Box>
        </Box>
      </Box>

      {/* Employee List */}
      <List sx={{ px: 1 }}>
        {filteredEmployees.map((employee) => (
          <Card key={employee.employeeId} sx={{ mb: 1 }}>
            <ListItem 
              onClick={() => handleExpandClick(employee.employeeId)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: getRiskColor(employee.riskLevel) }}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {employee.name}
                    </Typography>
                    <Chip 
                      label={getRiskLabel(employee.riskLevel)}
                      size="small"
                      sx={{ 
                        bgcolor: getRiskColor(employee.riskLevel),
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      {employee.department} · {employee.position}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={employee.usageRate}
                        sx={{ 
                          flexGrow: 1, 
                          mr: 1,
                          height: 6,
                          borderRadius: 1,
                          bgcolor: 'grey.300',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: employee.usageRate > 80 ? 'error.main' : 
                                    employee.usageRate > 50 ? 'warning.main' : 'success.main'
                          }
                        }}
                      />
                      <Typography variant="caption" fontWeight="medium">
                        {employee.usageRate}%
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end">
                  {expandedId === employee.employeeId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            
            <Collapse in={expandedId === employee.employeeId} timeout="auto" unmountOnExit>
              <CardContent sx={{ pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">총 연차</Typography>
                    <Typography variant="body2" fontWeight="medium">{employee.totalAnnualLeave}일</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">사용</Typography>
                    <Typography variant="body2" fontWeight="medium" color="primary">{employee.usedAnnualLeave}일</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">대기</Typography>
                    <Typography variant="body2" fontWeight="medium" color="warning.main">{employee.pendingAnnualLeave}일</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">잔여</Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">{employee.remainingAnnualLeave}일</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </List>

      {/* Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onOpen={() => setFilterDrawerOpen(true)}
      >
        <Box sx={{ p: 3, maxHeight: '50vh' }}>
          <Typography variant="h6" gutterBottom>필터</Typography>
          
          <TextField
            select
            fullWidth
            label="부서"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="all">전체</MenuItem>
            {departments.map(dept => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="위험도"
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="high">높음</MenuItem>
            <MenuItem value="medium">중간</MenuItem>
            <MenuItem value="low">낮음</MenuItem>
          </TextField>

          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => setFilterDrawerOpen(false)}
          >
            적용
          </Button>
        </Box>
      </SwipeableDrawer>

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Fab 
          size="small" 
          color="secondary"
          onClick={() => setAnchorEl(document.body)}
        >
          <AnalyticsIcon />
        </Fab>
        <Fab 
          color="primary"
          onClick={handleExportExcel}
        >
          <DownloadIcon />
        </Fab>
      </Box>

      {/* Quick Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { handleExportExcel(); setAnchorEl(null); }}>
          Excel 내보내기
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          차트 보기
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MobileLeaveOverview;