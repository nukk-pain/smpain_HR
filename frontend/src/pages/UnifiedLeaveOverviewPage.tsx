import React from 'react';
import { useAuth } from '../components/AuthProvider';
import UnifiedLeaveOverview from '../components/UnifiedLeaveOverview';

const UnifiedLeaveOverviewPage: React.FC = () => {
  const { user } = useAuth();
  
  const userRole = user?.role as 'admin' | 'supervisor';
  const initialViewMode = userRole === 'admin' ? 'overview' : 'team';
  
  return (
    <UnifiedLeaveOverview 
      userRole={userRole}
      initialViewMode={initialViewMode as 'overview' | 'team' | 'department'}
    />
  );
};

export default UnifiedLeaveOverviewPage;