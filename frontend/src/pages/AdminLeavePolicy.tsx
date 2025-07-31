import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  BusinessCenter as BusinessIcon
} from '@mui/icons-material';
import { useNotification } from '../components/NotificationProvider';
import { ApiService } from '../services/api';

interface LeavePolicy {
  policyId: string;
  annualLeaveRules: {
    firstYear: number;
    baseSecondYear: number;
    maxAnnualLeave: number;
    monthlyProration: boolean;
  };
  specialRules: {
    saturdayLeave: number;
    sundayLeave: number;
    holidayLeave: number;
  };
  leaveTypes: {
    annual: {
      advanceNotice: number;
      maxConsecutive: number;
    };
    family: {
      managerApproval: boolean;
      documentRequired: boolean;
    };
    personal: {
      yearlyLimit: number;
      paid: boolean;
    };
  };
  businessRules: {
    minAdvanceDays: number;
    maxConcurrentRequests: number;
  };
  carryOverRules: {
    maxCarryOverDays: number;
    carryOverDeadline: string;
  };
  updatedAt: string;
  updatedBy: string;
}

const AdminLeavePolicy: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<LeavePolicy | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const apiService = new ApiService();

  useEffect(() => {
    loadCurrentPolicy();
  }, []);

  const loadCurrentPolicy = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLeavePolicy();
      
      if (response.success) {
        setPolicy(response.data);
      } else {
        showError('정책 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Error loading policy:', error);
      showError('정책 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    
    try {
      setSaving(true);
      const response = await apiService.updateLeavePolicy(policy);
      
      if (response.success) {
        showSuccess('휴가 정책이 저장되었습니다.');
        setHasChanges(false);
        // Reload to get updated timestamps
        await loadCurrentPolicy();
      } else {
        showError(response.error || '정책 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      showError('정책 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePolicyChange = (path: string, value: any) => {
    if (!policy) return;
    
    const newPolicy = { ...policy };
    const pathParts = path.split('.');
    let current: any = newPolicy;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setPolicy(newPolicy);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (window.confirm('모든 변경사항이 취소됩니다. 계속하시겠습니까?')) {
      loadCurrentPolicy();
      setHasChanges(false);
    }
  };

  const handlePreview = () => {
    if (!policy) return;
    
    const previewData = {
      '1년차 직원 연차': `${policy.annualLeaveRules.firstYear}일`,
      '3년차 직원 연차': `${policy.annualLeaveRules.baseSecondYear + 1}일`,
      '10년차 직원 연차': `${Math.min(policy.annualLeaveRules.baseSecondYear + 8, policy.annualLeaveRules.maxAnnualLeave)}일`,
      '토요일 휴가': `${policy.specialRules.saturdayLeave}일`,
      '일요일 휴가': `${policy.specialRules.sundayLeave}일`,
      '연차 사전 신청': `${policy.leaveTypes.annual.advanceNotice}일 전`,
      '개인휴가 한도': `${policy.leaveTypes.personal.yearlyLimit}일`,
      '최대 이월 연차': `${policy.carryOverRules.maxCarryOverDays}일`
    };
    
    const previewText = Object.entries(previewData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    alert(`정책 미리보기:\n\n${previewText}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!policy) {
    return (
      <Alert severity="error">
        정책 정보를 불러올 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          📐 휴가 정책 관리
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            초기화
          </Button>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
          >
            정책 미리보기
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSavePolicy}
            disabled={saving || !hasChanges}
          >
            {saving ? <CircularProgress size={20} /> : '저장'}
          </Button>
        </Box>
      </Box>
      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          변경사항이 있습니다. 저장 버튼을 클릭하여 정책을 저장하세요.
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* 연차 계산 규칙 */}
        <Grid size={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">🗓️ 연차 계산 규칙</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <TextField
                    fullWidth
                    label="1년차 기본 연차"
                    type="number"
                    value={policy.annualLeaveRules.firstYear}
                    onChange={(e) => handlePolicyChange('annualLeaveRules.firstYear', Number(e.target.value))}
                    inputProps={{ min: 1, max: 30 }}
                    helperText="신입사원 기본 연차"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <TextField
                    fullWidth
                    label="2년차 이상 기본"
                    type="number"
                    value={policy.annualLeaveRules.baseSecondYear}
                    onChange={(e) => handlePolicyChange('annualLeaveRules.baseSecondYear', Number(e.target.value))}
                    inputProps={{ min: 1, max: 30 }}
                    helperText="2년차부터 기본 연차"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <TextField
                    fullWidth
                    label="최대 연차"
                    type="number"
                    value={policy.annualLeaveRules.maxAnnualLeave}
                    onChange={(e) => handlePolicyChange('annualLeaveRules.maxAnnualLeave', Number(e.target.value))}
                    inputProps={{ min: 1, max: 50 }}
                    helperText="연차 상한선"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={policy.annualLeaveRules.monthlyProration}
                        onChange={(e) => handlePolicyChange('annualLeaveRules.monthlyProration', e.target.checked)}
                      />
                    }
                    label="월 중 입사 일할계산"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 특별 규칙 */}
        <Grid size={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">⏰ 특별 규칙</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <TextField
                    fullWidth
                    label="토요일 휴가 계산"
                    type="number"
                    value={policy.specialRules.saturdayLeave}
                    onChange={(e) => handlePolicyChange('specialRules.saturdayLeave', Number(e.target.value))}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    helperText="토요일 휴가시 차감 일수"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <TextField
                    fullWidth
                    label="일요일 휴가 계산"
                    type="number"
                    value={policy.specialRules.sundayLeave}
                    onChange={(e) => handlePolicyChange('specialRules.sundayLeave', Number(e.target.value))}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    helperText="일요일 휴가시 차감 일수"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <TextField
                    fullWidth
                    label="공휴일 휴가 계산"
                    type="number"
                    value={policy.specialRules.holidayLeave}
                    onChange={(e) => handlePolicyChange('specialRules.holidayLeave', Number(e.target.value))}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    helperText="공휴일 휴가시 차감 일수"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 휴가 종류별 설정 */}
        <Grid size={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">🏷️ 휴가 종류별 설정</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Typography variant="subtitle1" gutterBottom>
                    연차 휴가
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="사전 신청 일수"
                        type="number"
                        value={policy.leaveTypes.annual.advanceNotice}
                        onChange={(e) => handlePolicyChange('leaveTypes.annual.advanceNotice', Number(e.target.value))}
                        inputProps={{ min: 0, max: 30 }}
                        helperText="몇 일 전에 신청해야 하는지"
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="최대 연속 일수"
                        type="number"
                        value={policy.leaveTypes.annual.maxConsecutive}
                        onChange={(e) => handlePolicyChange('leaveTypes.annual.maxConsecutive', Number(e.target.value))}
                        inputProps={{ min: 1, max: 50 }}
                        helperText="한 번에 사용할 수 있는 최대 일수"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Typography variant="subtitle1" gutterBottom>
                    경조사 휴가
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={policy.leaveTypes.family.managerApproval}
                            onChange={(e) => handlePolicyChange('leaveTypes.family.managerApproval', e.target.checked)}
                          />
                        }
                        label="부서장 승인 필수"
                      />
                    </Grid>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={policy.leaveTypes.family.documentRequired}
                            onChange={(e) => handlePolicyChange('leaveTypes.family.documentRequired', e.target.checked)}
                          />
                        }
                        label="증빙서류 필수"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Typography variant="subtitle1" gutterBottom>
                    개인 휴가
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="연간 한도"
                        type="number"
                        value={policy.leaveTypes.personal.yearlyLimit}
                        onChange={(e) => handlePolicyChange('leaveTypes.personal.yearlyLimit', Number(e.target.value))}
                        inputProps={{ min: 0, max: 30 }}
                        helperText="연간 사용 가능한 개인휴가 일수"
                      />
                    </Grid>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={policy.leaveTypes.personal.paid}
                            onChange={(e) => handlePolicyChange('leaveTypes.personal.paid', e.target.checked)}
                          />
                        }
                        label="급여 지급 (무급이면 OFF)"
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 업무 규칙 */}
        <Grid size={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">💼 업무 규칙</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <TextField
                    fullWidth
                    label="최소 사전 신청 일수"
                    type="number"
                    value={policy.businessRules.minAdvanceDays}
                    onChange={(e) => handlePolicyChange('businessRules.minAdvanceDays', Number(e.target.value))}
                    inputProps={{ min: 0, max: 30 }}
                    helperText="휴가 신청 최소 사전 통보 일수"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <TextField
                    fullWidth
                    label="최대 동시 신청 건수"
                    type="number"
                    value={policy.businessRules.maxConcurrentRequests}
                    onChange={(e) => handlePolicyChange('businessRules.maxConcurrentRequests', Number(e.target.value))}
                    inputProps={{ min: 1, max: 10 }}
                    helperText="동시에 처리 대기할 수 있는 신청 건수"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 이월 규칙 */}
        <Grid size={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">🔄 이월 규칙</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <TextField
                    fullWidth
                    label="최대 이월 가능 일수"
                    type="number"
                    value={policy.carryOverRules.maxCarryOverDays}
                    onChange={(e) => handlePolicyChange('carryOverRules.maxCarryOverDays', Number(e.target.value))}
                    inputProps={{ min: 0, max: 30 }}
                    helperText="전년도에서 이월 가능한 최대 일수"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <TextField
                    fullWidth
                    label="이월 사용 마감일"
                    value={policy.carryOverRules.carryOverDeadline}
                    onChange={(e) => handlePolicyChange('carryOverRules.carryOverDeadline', e.target.value)}
                    helperText="MM-DD 형식 (예: 02-28)"
                    placeholder="02-28"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
      {/* 정책 적용 현황 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 정책 적용 현황
          </Typography>
          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="body2" color="text.secondary">
                마지막 업데이트: {new Date(policy.updatedAt).toLocaleString('ko-KR')}
              </Typography>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="body2" color="text.secondary">
                업데이트한 사람: {policy.updatedBy}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLeavePolicy;