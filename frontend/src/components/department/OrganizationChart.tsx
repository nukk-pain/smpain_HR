import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Alert } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { OrganizationChart as OrgChartType } from '../../types';
import { TreeUser } from '../../types/DepartmentManagementTypes';
import { getRoleColor } from '../../utils/roleUtils';
import { UserRole } from '../../types';

interface OrganizationChartProps {
  organizationChart: OrgChartType | null;
}

const OrganizationChart: React.FC<OrganizationChartProps> = ({ organizationChart }) => {
  const renderUserTree = (user: TreeUser, level: number = 0) => {
    return (
      <Box key={`${user._id}-${level}`} sx={{ ml: level * 3 }}>
        <Card sx={{ mb: 1, backgroundColor: level === 0 ? '#f5f5f5' : 'white' }}>
          <CardContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color={getRoleColor((user.role || 'user') as UserRole)} />
              <Typography variant="subtitle2">{user.name}</Typography>
              {user.role && <Chip label={user.role} size="small" color={getRoleColor(user.role as UserRole)} />}
              <Typography variant="body2" color="text.secondary">
                {user.department} - {user.position}
              </Typography>
            </Box>
          </CardContent>
        </Card>
        {user.subordinates && user.subordinates.length > 0 && (
          <Box sx={{ ml: 2 }}>
            {user.subordinates.map((subordinate, index) => renderUserTree(subordinate, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Organization Chart</Typography>
        {organizationChart && organizationChart.organizationTree.length > 0 ? (
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            {organizationChart.organizationTree.map((user) => renderUserTree(user))}
          </Box>
        ) : (
          <Alert severity="info">No organization structure found</Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizationChart;