import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { SupervisorAccount as SupervisorIcon } from '@mui/icons-material';
import { OrganizationChart } from '../../types';

interface OrganizationSummaryProps {
  organizationChart: OrganizationChart | null;
}

const OrganizationSummary: React.FC<OrganizationSummaryProps> = ({ organizationChart }) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SupervisorIcon color="primary" />
          <Typography variant="h6">Organization Summary</Typography>
        </Box>
        {organizationChart && (
          <Grid container spacing={2}>
            <Grid size={6}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" color="primary">
                  {organizationChart.summary.totalEmployees}
                </Typography>
                <Typography variant="body2">Total Employees</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" color="primary">
                  {organizationChart.summary.totalDepartments}
                </Typography>
                <Typography variant="body2">Departments</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" color="warning.main">
                  {organizationChart.summary.managersCount}
                </Typography>
                <Typography variant="body2">Supervisors</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" color="error.main">
                  {organizationChart.summary.adminCount}
                </Typography>
                <Typography variant="body2">Administrators</Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizationSummary;