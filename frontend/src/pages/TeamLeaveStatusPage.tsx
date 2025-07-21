import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, BarChart3 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2" role="group" aria-label="view mode">
          <Button
            variant={viewMode === 'team' ? 'default' : 'outline'}
            onClick={() => setViewMode('team')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            팀 현황
          </Button>
          <Button
            variant={viewMode === 'department' ? 'default' : 'outline'}
            onClick={() => setViewMode('department')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            부서 통계
          </Button>
        </div>
      </div>
      
      <TeamLeaveStatus viewMode={viewMode} />
    </div>
  );
};

export default TeamLeaveStatusPage;