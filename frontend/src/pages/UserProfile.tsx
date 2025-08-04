import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Person as PersonIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';
import { User } from '../types';

const UserProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phoneNumber: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    if (user) {
      setUserInfo(user);
      setFormData({
        name: user.name || '',
        birthDate: user.birthDate || '',
        phoneNumber: user.phoneNumber || '',
        department: user.department || '',
        position: user.position || ''
      });
    }
  }, [user]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (userInfo) {
      setFormData({
        name: userInfo.name || '',
        birthDate: userInfo.birthDate || '',
        phoneNumber: userInfo.phoneNumber || '',
        department: userInfo.department || '',
        position: userInfo.position || ''
      });
    }
  };

  const handleSave = async () => {
    if (!userInfo) {
      console.error('No userInfo available');
      showError('사용자 정보를 찾을 수 없습니다.');
      return;
    }
    
    
    try {
      setLoading(true);
      
      // Only send the fields that the user can actually edit
      const updateData = {
        name: formData.name,
        birthDate: formData.birthDate,
        phoneNumber: formData.phoneNumber
      };

      const userId = userInfo._id;
      
      await apiService.updateUserProfile(userId, updateData);
      
      // Refresh user data
      await refreshUser();
      
      showSuccess('개인정보가 성공적으로 업데이트되었습니다.');
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      showError(error.response?.data?.error || '개인정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeLabel = (type?: string) => {
    switch (type) {
      case 'regular':
        return '정규직';
      case 'contract':
        return '계약직';
      default:
        return '정보 없음';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'manager':
        return '매니저'; // Legacy support
      case 'supervisor':
        return '감독자';
      case 'user':
        return '사용자';
      default:
        return '정보 없음';
    }
  };

  if (!userInfo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          👤 내 정보
        </Typography>
        {!editing ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            정보 수정
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : '저장'}
            </Button>
          </Box>
        )}
      </Box>
      {/* Profile Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {userInfo.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {userInfo.employeeId} | {userInfo.department || '부서 정보 없음'}
              </Typography>
              <Chip 
                label={getRoleLabel(userInfo.role)}
                color="primary"
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      {/* Personal Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            👤 개인 정보
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="이름"
                value={formData.name}
                disabled
                placeholder="홍길동"
                inputProps={{
                  style: { imeMode: 'active' }
                }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="생년월일"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={!editing}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="전화번호"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!editing}
                placeholder="010-1234-5678"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* Work Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🏢 근무 정보
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="부서"
                value={userInfo.department || '정보 없음'}
                disabled
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="직급"
                value={userInfo.position || '정보 없음'}
                disabled
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="입사일"
                value={userInfo.hireDateFormatted || userInfo.hireDate || '정보 없음'}
                disabled
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="근무 형태"
                value={getContractTypeLabel(userInfo.contractType)}
                disabled
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="근속년수"
                value={userInfo.yearsOfService !== undefined && userInfo.yearsOfService !== null ? `${userInfo.yearsOfService}년` : '정보 없음'}
                disabled
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="연차"
                value={userInfo.annualLeave !== undefined && userInfo.annualLeave !== null ? `${userInfo.annualLeave}일` : '정보 없음'}
                disabled
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {editing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>수정 가능한 정보:</strong> 이름, 생년월일, 전화번호만 수정할 수 있습니다.
            부서, 직급 등의 근무 정보는 관리자에게 문의하세요.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default UserProfile;