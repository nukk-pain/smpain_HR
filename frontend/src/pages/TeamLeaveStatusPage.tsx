import React, { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Group, Assessment } from '@mui/icons-material';
import TeamLeaveStatus from '../components/TeamLeaveStatus';

const TeamLeaveStatusPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'team' | 'department'>('team');

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'team' | 'department'
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
        >
          <ToggleButton value="team" aria-label="team view">
            <Group sx={{ mr: 1 }} />
            팀 현황
          </ToggleButton>
          <ToggleButton value="department" aria-label="department view">
            <Assessment sx={{ mr: 1 }} />
            부서 통계
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <TeamLeaveStatus viewMode={viewMode} />
    </Box>
  );
};

export default TeamLeaveStatusPage;