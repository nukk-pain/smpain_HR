/**
 * UserForm Sections Components
 * 
 * Separate form sections to reduce UserForm.tsx line count below 500.
 * Each section handles specific user data input areas.
 */

import React, { memo } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  FormHelperText,
  InputAdornment,
  IconButton,
  Typography,
  Box,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Phone,
  Business,
  Work,
  Security,
  Info
} from '@mui/icons-material';

// Section props interfaces
interface BasicInfoSectionProps {
  formData: any;
  errors: any;
  isSubmitting: boolean;
  isEditing: boolean;
  showPassword: boolean;
  onFieldChange: (field: string, value: any) => void;
  onFieldBlur: (field: string) => void;
  onTogglePassword: () => void;
}

interface ContactInfoSectionProps {
  formData: any;
  errors: any;
  isSubmitting: boolean;
  departments: string[];
  positions: {_id: string; name: string}[];
  onFieldChange: (field: string, value: any) => void;
  onFieldBlur: (field: string) => void;
}

interface RolePermissionsSectionProps {
  formData: any;
  errors: any;
  isSubmitting: boolean;
  roles: string[];
  supervisors: any[];
  onFieldChange: (field: string, value: any) => void;
  currentUser?: any;
  departments?: any[];
}

interface EmploymentDetailsSectionProps {
  formData: any;
  errors: any;
  isSubmitting: boolean;
  onFieldChange: (field: string, value: any) => void;
}

// Form section constants
export const FORM_SECTIONS = {
  BASIC: {
    title: '기본 정보',
    icon: <Person sx={{ fontSize: 20 }} />
  },
  CONTACT: {
    title: '연락처 정보',
    icon: <Phone sx={{ fontSize: 20 }} />
  },
  ROLE: {
    title: '역할 및 권한',
    icon: <Security sx={{ fontSize: 20 }} />
  },
  EMPLOYMENT: {
    title: '고용 정보',
    icon: <Work sx={{ fontSize: 20 }} />
  }
};

/**
 * Basic Information Section
 * Username, Password, Name, Employee ID
 */
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = memo(({
  formData,
  errors,
  isSubmitting,
  isEditing,
  showPassword,
  onFieldChange,
  onFieldBlur,
  onTogglePassword
}) => (
  <Box mb={3}>
    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {FORM_SECTIONS.BASIC.icon}
      {FORM_SECTIONS.BASIC.title}
    </Typography>
    <Grid container spacing={2}>
      {/* Username */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="사용자명"
          value={formData.username}
          onChange={(e) => onFieldChange('username', e.target.value)}
          onBlur={() => onFieldBlur('username')}
          error={Boolean(errors.username)}
          helperText={errors.username}
          required
          disabled={isSubmitting}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person />
              </InputAdornment>
            )
          }}
        />
      </Grid>

      {/* Password - only show for new users */}
      {!isEditing && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => onFieldChange('password', e.target.value)}
            onBlur={() => onFieldBlur('password')}
            error={Boolean(errors.password)}
            helperText={errors.password}
            required
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={onTogglePassword}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
      )}

      {/* Name */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="이름"
          value={formData.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          onBlur={() => onFieldBlur('name')}
          error={Boolean(errors.name)}
          helperText={errors.name}
          required
          disabled={isSubmitting}
        />
      </Grid>

      {/* Employee ID */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="사원번호"
          value="자동 생성됩니다"
          disabled={true}
          helperText="입사일 기준으로 자동 생성 (예: 20250001)"
          InputProps={{
            style: { 
              backgroundColor: '#f5f5f5',
              color: '#666'
            }
          }}
        />
      </Grid>
    </Grid>
  </Box>
));

/**
 * Contact Information Section
 * Phone, Department, Position
 */
export const ContactInfoSection: React.FC<ContactInfoSectionProps> = memo(({
  formData,
  errors,
  isSubmitting,
  departments,
  positions,
  onFieldChange,
  onFieldBlur
}) => (
  <Box mb={3}>
    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {FORM_SECTIONS.CONTACT.icon}
      {FORM_SECTIONS.CONTACT.title}
    </Typography>
    <Grid container spacing={2}>

      {/* Phone Number */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="전화번호"
          value={formData.phoneNumber}
          onChange={(e) => onFieldChange('phoneNumber', e.target.value)}
          onBlur={() => onFieldBlur('phoneNumber')}
          error={Boolean(errors.phoneNumber)}
          helperText={errors.phoneNumber}
          disabled={isSubmitting}
          placeholder="010-1234-5678"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Phone />
              </InputAdornment>
            )
          }}
        />
      </Grid>

      {/* Department */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>부서</InputLabel>
          <Select
            value={formData.department}
            label="부서"
            onChange={(e) => onFieldChange('department', e.target.value)}
            disabled={isSubmitting}
            startAdornment={<Business sx={{ mr: 1, color: 'action.active' }} />}
          >
            <MenuItem value="">선택 안함</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Position */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>직책</InputLabel>
          <Select
            value={formData.position}
            label="직책"
            onChange={(e) => onFieldChange('position', e.target.value)}
            disabled={isSubmitting}
            startAdornment={<Work sx={{ mr: 1, color: 'action.active' }} />}
          >
            <MenuItem value="">선택 안함</MenuItem>
            {positions.map((position) => (
              <MenuItem key={position._id} value={position.name}>
                {position.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  </Box>
));

/**
 * Role and Permissions Section
 * Role, Supervisor
 */
export const RolePermissionsSection: React.FC<RolePermissionsSectionProps> = memo(({
  formData,
  errors,
  isSubmitting,
  roles,
  supervisors,
  onFieldChange,
  currentUser,
  departments = []
}) => (
  <Box mb={3}>
    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {FORM_SECTIONS.ROLE.icon}
      {FORM_SECTIONS.ROLE.title}
    </Typography>
    <Grid container spacing={2}>
      {/* Role */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={Boolean(errors.role)}>
          <InputLabel>역할</InputLabel>
          <Select
            value={formData.role}
            label="역할"
            onChange={(e) => onFieldChange('role', e.target.value)}
            disabled={isSubmitting}
          >
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
          {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
        </FormControl>
      </Grid>

      {/* Supervisor - show only for non-admin roles */}
      {formData.role !== 'admin' && (
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>상급자</InputLabel>
            <Select
              value={formData.managerId || ''}
              label="상급자"
              onChange={(e) => onFieldChange('managerId', e.target.value)}
              disabled={isSubmitting}
            >
              <MenuItem value="">선택 안함</MenuItem>
              {supervisors.map((supervisor) => (
                <MenuItem key={supervisor._id} value={supervisor._id}>
                  {supervisor.name} ({supervisor.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}

      {/* Visible Teams - only for admin users */}
      {currentUser?.role === 'admin' && (
        <Grid item xs={12}>
          <Autocomplete
            multiple
            freeSolo
            value={formData.visibleTeams || []}
            onChange={(event, newValue) => {
              const teams = newValue.map(item => 
                typeof item === 'string' 
                  ? { departmentId: '', departmentName: item }
                  : item
              );
              onFieldChange('visibleTeams', teams);
            }}
            options={departments.map(dept => ({
              departmentId: dept._id,
              departmentName: dept.name
            }))}
            getOptionLabel={(option) => 
              typeof option === 'string' ? option : option.departmentName
            }
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={typeof option === 'string' ? option : option.departmentName}
                  {...getTagProps({ index })}
                  key={index}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="접근 가능한 팀/부서"
                placeholder="부서를 선택하거나 직접 입력"
                helperText="이 사용자가 관리할 수 있는 부서를 설정합니다 (관리자만 설정 가능)"
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>
      )}
    </Grid>
  </Box>
));

/**
 * Employment Details Section
 * Base Salary, Hire Date, Birth Date, Contract Type, Account Number
 */
export const EmploymentDetailsSection: React.FC<EmploymentDetailsSectionProps> = memo(({
  formData,
  errors,
  isSubmitting,
  onFieldChange
}) => (
  <Box mb={3}>
    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {FORM_SECTIONS.EMPLOYMENT.icon}
      {FORM_SECTIONS.EMPLOYMENT.title}
    </Typography>
    <Grid container spacing={2}>
      {/* Base Salary */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="기본급"
          type="number"
          value={formData.baseSalary}
          onChange={(e) => onFieldChange('baseSalary', parseInt(e.target.value) || 0)}
          error={Boolean(errors.baseSalary)}
          helperText={errors.baseSalary}
          disabled={isSubmitting}
          InputProps={{
            startAdornment: <InputAdornment position="start">₩</InputAdornment>
          }}
        />
      </Grid>

      {/* Hire Date */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="입사일"
          type="date"
          value={formData.hireDate}
          onChange={(e) => onFieldChange('hireDate', e.target.value)}
          disabled={isSubmitting}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      {/* Birth Date */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="생년월일"
          type="date"
          value={formData.birthDate}
          onChange={(e) => onFieldChange('birthDate', e.target.value)}
          disabled={isSubmitting}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      {/* Contract Type */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>계약 형태</InputLabel>
          <Select
            value={formData.contractType || 'fulltime'}
            label="계약 형태"
            onChange={(e) => onFieldChange('contractType', e.target.value)}
            disabled={isSubmitting}
          >
            {['fulltime', 'parttime', 'contract', 'intern'].map((type) => {
              const labels = { fulltime: '정규직', parttime: '파트타임', contract: '계약직', intern: '인턴' };
              return (
                <MenuItem key={type} value={type}>
                  {labels[type as keyof typeof labels]}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Grid>

      {/* Account Number */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="계좌번호"
          value={formData.accountNumber}
          onChange={(e) => onFieldChange('accountNumber', e.target.value)}
          disabled={isSubmitting}
          placeholder="123-456-789012"
        />
      </Grid>
    </Grid>
  </Box>
));

// Display names for debugging
BasicInfoSection.displayName = 'BasicInfoSection';
ContactInfoSection.displayName = 'ContactInfoSection';
RolePermissionsSection.displayName = 'RolePermissionsSection';
EmploymentDetailsSection.displayName = 'EmploymentDetailsSection';