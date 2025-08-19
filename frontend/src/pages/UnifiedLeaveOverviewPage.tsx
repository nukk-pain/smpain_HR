import React from 'react';
import { Box } from '@mui/material';
import { useAuth } from '../components/AuthProvider';
import UnifiedLeaveOverview from '../components/UnifiedLeaveOverview';

const UnifiedLeaveOverviewPage: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) {
    return null; // Protected route will handle this
  }
  
  return (
    <Box>
      <UnifiedLeaveOverview 
        userRole={user.role as 'admin' | 'supervisor'}
        initialViewMode={user.role === 'admin' ? 'overview' : 'team'}
      />
    </Box>
  );
};

export default UnifiedLeaveOverviewPage;