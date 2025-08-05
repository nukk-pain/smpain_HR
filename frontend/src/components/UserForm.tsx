/**
 * UserForm Component - Simplified Version
 * 
 * Streamlined user creation and editing form using sectioned components.
 * Maintains under 500 lines by delegating form sections to separate components.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tooltip,
  Chip,
  IconButton
} from '@mui/material';
import {
  Save,
  Cancel,
  Info,
  Close
} from '@mui/icons-material';
import { User } from '../types';
import { useUserForm } from '../hooks/useUserForm';
import {
  BasicInfoSection,
  ContactInfoSection,
  RolePermissionsSection,
  EmploymentDetailsSection
} from './UserFormSections';

// Component props interface
export interface UserFormProps {
  user?: User | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onSubmit: (userData: any) => void;
  onCancel: () => void;
  departments: string[];
  positions: {_id: string; name: string}[];
  roles: string[];
  supervisors: User[];
  currentUser: User;
}

// Role name mapping
const ROLE_NAMES = {
  admin: '관리자',
  supervisor: '팀장',
  user: '사용자'
};

/**
 * UserForm - Simplified form component with sectioned UI
 */
export const UserForm: React.FC<UserFormProps> = memo(({
  user,
  isOpen,
  isSubmitting,
  onSubmit,
  onCancel,
  departments,
  positions,
  roles,
  supervisors,
  currentUser
}) => {
  // Form state management
  const {
    formData,
    errors,
    isDirty,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm
  } = useUserForm(user, {
    validateOnChange: true,
    validateOnBlur: true
  });

  // Local UI state
  const [showPassword, setShowPassword] = useState(false);
  
  // Computed values
  const isEditing = Boolean(user);
  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit = isValid && isDirty && !isSubmitting;

  // Event handlers
  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit((data) => {
      onSubmit(data);
    });
  }, [handleSubmit, onSubmit]);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Dialog title with validation status
  const dialogTitle = useMemo(() => (
    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
      <Typography variant="h6">
        {isEditing ? '사용자 수정' : '사용자 등록'}
      </Typography>
      
      <Box display="flex" alignItems="center" gap={1}>
        {hasErrors && (
          <Tooltip title={`검증 오류: ${Object.keys(errors).length}개`}>
            <Chip
              icon={<Info />}
              label={`오류 ${Object.keys(errors).length}개`}
              color="error"
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}
        <IconButton
          onClick={handleCancel}
          size="small"
          disabled={isSubmitting}
        >
          <Close />
        </IconButton>
      </Box>
    </Box>
  ), [isEditing, hasErrors, Object.keys(errors).length, handleCancel, isSubmitting]);

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isSubmitting}
    >
      <DialogTitle>
        {dialogTitle}
      </DialogTitle>
      
      <form onSubmit={handleFormSubmit}>
        <DialogContent dividers>
          {/* Form Sections */}
          <BasicInfoSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            showPassword={showPassword}
            onFieldChange={handleChange}
            onFieldBlur={handleBlur}
            onTogglePassword={togglePasswordVisibility}
          />

          <ContactInfoSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            departments={departments}
            positions={positions}
            onFieldChange={handleChange}
            onFieldBlur={handleBlur}
          />

          <RolePermissionsSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            roles={roles}
            supervisors={supervisors}
            onFieldChange={handleChange}
            currentUser={currentUser}
            departments={departments.map(name => ({ _id: name, name }))}
          />

          <EmploymentDetailsSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            onFieldChange={handleChange}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Box display="flex" justifyContent="space-between" width="100%">
            {/* Validation Summary */}
            <Box>
              {isDirty && (
                <Typography variant="caption" color="text.secondary">
                  변경사항이 있습니다
                </Typography>
              )}
            </Box>

            {/* Action Buttons */}
            <Box display="flex" gap={1}>
              <Button
                onClick={handleCancel}
                disabled={isSubmitting}
                variant="outlined"
              >
                <Cancel sx={{ mr: 1 }} />
                취소
              </Button>
              
              <Tooltip 
                title={
                  !canSubmit ? 
                    (!isValid ? '유효하지 않은 입력이 있습니다' : 
                     !isDirty ? '변경사항이 없습니다' : 
                     isSubmitting ? '처리 중...' : '') 
                    : ''
                }
              >
                <span>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!canSubmit}
                    startIcon={<Save />}
                  >
                    {isSubmitting ? '저장 중...' : '저장'}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
});

// Display name for debugging
UserForm.displayName = 'UserForm';