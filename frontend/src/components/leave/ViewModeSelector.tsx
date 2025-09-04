import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ViewMode } from '../../types/leave';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  userRole: 'admin' | 'supervisor';
  onChange: (event: React.MouseEvent<HTMLElement>, newMode: string | null) => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  viewMode,
  userRole,
  onChange
}) => {
  const availableModes = userRole === 'admin' 
    ? ['overview', 'team', 'department']
    : ['team', 'department'];

  return (
    <ToggleButtonGroup 
      value={viewMode} 
      exclusive 
      onChange={onChange}
      size="small"
    >
      {availableModes.includes('overview') && (
        <ToggleButton value="overview">전체 현황</ToggleButton>
      )}
      <ToggleButton value="team">팀 현황</ToggleButton>
      <ToggleButton value="department">부서 통계</ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ViewModeSelector;