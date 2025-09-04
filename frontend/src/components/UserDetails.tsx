/**
 * UserDetails Component
 * 
 * Provides detailed user information display functionality.
 * Extracted from UserManagement component to follow SRP with performance enhancements.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  Divider,
  Avatar,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  Person,
  Phone,
  Business,
  Work,
  CalendarToday,
  AccountBalance,
  Edit,
  Delete,
  Close,
  Info,
  ContactMail,
  Badge
} from '@mui/icons-material';
import { User } from '../types';

// Component props interface
export interface UserDetailsProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  canEdit: boolean;
  canDelete: boolean;
  loading?: boolean;
}

// Memoized constants for performance
const ROLE_NAMES = {
  admin: '관리자',
  supervisor: '팀장',
  user: '사용자'
} as const;

const CONTRACT_TYPES = {
  regular: '정규직',
  contract: '계약직'
} as const;

// Information section interface
interface InfoSectionProps {
  title: string;
  icon: React.ReactElement;
  children: React.ReactNode;
}

// Memoized info section component
const InfoSection: React.FC<InfoSectionProps> = memo(({ title, icon, children }) => (
  <Card elevation={1} sx={{ mb: 2 }}>
    <CardContent>
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'primary.main',
          fontWeight: 'medium'
        }}
      >
        {icon}
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </CardContent>
  </Card>
));

InfoSection.displayName = 'InfoSection';

// Memoized info row component
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactElement;
}

const InfoRow: React.FC<InfoRowProps> = memo(({ label, value, icon }) => (
  <Grid container spacing={2} sx={{ mb: 1.5 }}>
    <Grid size={{ xs: 12, sm: 4 }}>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          fontWeight: 'medium'
        }}
      >
        {icon}
        {label}
      </Typography>
    </Grid>
    <Grid size={{ xs: 12, sm: 8 }}>
      <Typography variant="body1">
        {value || '-'}
      </Typography>
    </Grid>
  </Grid>
));

InfoRow.displayName = 'InfoRow';

/**
 * Optimized UserDetails component with React.memo and responsive design
 */
export const UserDetails: React.FC<UserDetailsProps> = memo(({
  user,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Memoized event handlers
  const handleEdit = useCallback(() => {
    if (user) {
      onEdit(user);
    }
  }, [user, onEdit]);

  const handleDelete = useCallback(() => {
    if (user) {
      onDelete(user);
    }
  }, [user, onDelete]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoized computed values
  const roleDisplayName = useMemo(() => {
    if (!user) return '';
    return ROLE_NAMES[user.role as keyof typeof ROLE_NAMES] || user.role;
  }, [user]);

  const contractTypeDisplayName = useMemo(() => {
    if (!user?.contractType) return '-';
    return CONTRACT_TYPES[user.contractType as keyof typeof CONTRACT_TYPES] || user.contractType;
  }, [user]);

  const formattedSalary = useMemo(() => {
    if (!user?.baseSalary) return '-';
    return `₩${user.baseSalary.toLocaleString()}`;
  }, [user]);

  const statusChip = useMemo(() => {
    if (!user) return null;
    return (
      <Chip
        label={user.isActive ? '활성' : '비활성'}
        color={user.isActive ? 'success' : 'error'}
        size="small"
        variant="outlined"
      />
    );
  }, [user]);

  const userAvatar = useMemo(() => {
    if (!user) return null;
    return (
      <Avatar
        sx={{ 
          width: 80, 
          height: 80, 
          bgcolor: 'primary.main',
          fontSize: '2rem'
        }}
      >
        {user.name?.[0] || user.username?.[0] || '?'}
      </Avatar>
    );
  }, [user]);

  // Don't render if not open or no user
  if (!isOpen || !user) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogContent>
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            minHeight="300px"
            gap={2}
          >
            <CircularProgress role="progressbar" />
            <Typography variant="body1" color="text.secondary">
              사용자 정보를 불러오는 중...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="user-details-title"
      PaperProps={{
        sx: { 
          minHeight: isMobile ? '100vh' : '70vh',
          ...(isMobile && { borderRadius: 0 })
        },
        className: isMobile ? 'MuiDialog-paperFullScreen' : ''
      }}
    >
      <DialogTitle id="user-details-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h2">
            사용자 상세 정보
          </Typography>
          <IconButton
            onClick={handleClose}
            aria-label="닫기"
            size="small"
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* User Header */}
        <Box 
          display="flex" 
          alignItems="center" 
          gap={3} 
          mb={3}
          p={2}
          bgcolor="background.default"
          borderRadius={1}
        >
          {userAvatar}
          <Box flex={1}>
            <Typography variant="h4" gutterBottom>
              {user.name}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {user.username}
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <Chip
                label={roleDisplayName}
                color="primary"
                size="small"
              />
              {statusChip}
            </Box>
          </Box>
        </Box>

        {/* Basic Information */}
        <InfoSection title="기본 정보" icon={<Info />}>
          <InfoRow
            label="사용자명"
            value={user.username}
            icon={<Person fontSize="small" />}
          />
          <InfoRow
            label="이름"
            value={user.name}
            icon={<Badge fontSize="small" />}
          />
          <InfoRow
            label="역할"
            value={roleDisplayName}
            icon={<Work fontSize="small" />}
          />
          <InfoRow
            label="상태"
            value={statusChip}
          />
        </InfoSection>

        {/* Contact Information */}
        <InfoSection title="연락처 정보" icon={<ContactMail />}>
          <InfoRow
            label="전화번호"
            value={user.phoneNumber}
            icon={<Phone fontSize="small" />}
          />
        </InfoSection>

        {/* Employment Information */}
        <InfoSection title="고용 정보" icon={<Work />}>
          <InfoRow
            label="직원번호"
            value={user.employeeId}
            icon={<Badge fontSize="small" />}
          />
          <InfoRow
            label="부서"
            value={user.department}
            icon={<Business fontSize="small" />}
          />
          <InfoRow
            label="직책"
            value={user.position}
            icon={<Work fontSize="small" />}
          />
          <InfoRow
            label="기본급"
            value={formattedSalary}
            icon={<AccountBalance fontSize="small" />}
          />
          <InfoRow
            label="입사일"
            value={user.hireDate}
            icon={<CalendarToday fontSize="small" />}
          />
          <InfoRow
            label="생년월일"
            value={user.birthDate}
            icon={<CalendarToday fontSize="small" />}
          />
          <InfoRow
            label="계약형태"
            value={contractTypeDisplayName}
            icon={<Business fontSize="small" />}
          />
          <InfoRow
            label="계좌번호"
            value={user.accountNumber}
            icon={<AccountBalance fontSize="small" />}
          />
        </InfoSection>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          startIcon={<Close />}
        >
          닫기
        </Button>
        
        <Box ml="auto" display="flex" gap={1}>
          {canEdit && (
            <Button
              onClick={handleEdit}
              variant="outlined"
              color="primary"
              startIcon={<Edit />}
              disabled={loading}
            >
              수정
            </Button>
          )}
          
          {canDelete && (
            <Button
              onClick={handleDelete}
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              disabled={loading}
            >
              삭제
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
});

// Display name for debugging
UserDetails.displayName = 'UserDetails';