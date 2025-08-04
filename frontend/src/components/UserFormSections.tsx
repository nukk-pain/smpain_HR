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
  Box
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
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
    icon: <Email sx={{ fontSize: 20 }} />
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
          value={formData.employeeId}
          onChange={(e) => onFieldChange('employeeId', e.target.value)}
          onBlur={() => onFieldBlur('employeeId')}
          error={Boolean(errors.employeeId)}
          helperText={errors.employeeId}
          required
          disabled={isSubmitting}
        />
      </Grid>
    </Grid>
  </Box>
));

/**
 * Contact Information Section
 * Email, Phone, Department, Position
 */
export const ContactInfoSection: React.FC<ContactInfoSectionProps> = memo(({
  formData,
  errors,
  isSubmitting,
  departments,
  onFieldChange,
  onFieldBlur
}) => (
  <Box mb={3}>
    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {FORM_SECTIONS.CONTACT.icon}
      {FORM_SECTIONS.CONTACT.title}
    </Typography>
    <Grid container spacing={2}>
      {/* Email */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="이메일"
          type="email"
          value={formData.email}
          onChange={(e) => onFieldChange('email', e.target.value)}
          onBlur={() => onFieldBlur('email')}
          error={Boolean(errors.email)}
          helperText={errors.email}
          disabled={isSubmitting}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Email />
              </InputAdornment>
            )
          }}
        />
      </Grid>

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
        <TextField
          fullWidth
          label="직책"
          value={formData.position}
          onChange={(e) => onFieldChange('position', e.target.value)}
          disabled={isSubmitting}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Work />
              </InputAdornment>
            )
          }}
        />
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
  onFieldChange
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
              value={formData.supervisorId || ''}
              label="상급자"
              onChange={(e) => onFieldChange('supervisorId', e.target.value)}
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