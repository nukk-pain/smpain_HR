import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { 
  People, 
  TrendingUp, 
  Warning, 
  Schedule 
} from '@mui/icons-material';
import { Statistics } from '@/types/UnifiedLeaveOverviewTypes';

interface UnifiedLeaveOverviewStatsProps {
  statistics: Statistics;
}

const UnifiedLeaveOverviewStats: React.FC<UnifiedLeaveOverviewStatsProps> = ({
  statistics
}) => {
  const statCards = [
    {
      title: '전체 직원',
      value: statistics.totalEmployees,
      unit: '명',
      icon: <People />,
      color: '#2196f3'
    },
    {
      title: '평균 사용률',
      value: statistics.averageUsageRate,
      unit: '%',
      icon: <TrendingUp />,
      color: '#4caf50'
    },
    {
      title: '고위험',
      value: statistics.highRiskEmployees,
      unit: '명',
      icon: <Warning />,
      color: '#ff9800'
    },
    {
      title: '대기중',
      value: statistics.pendingRequests,
      unit: '건',
      icon: <Schedule />,
      color: '#9c27b0'
    }
  ];

  return (
    <Grid container spacing={2}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: `${stat.color}20`,
                    color: stat.color,
                    mr: 2
                  }}
                >
                  {stat.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="text.secondary" variant="caption">
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" sx={{ color: stat.color }}>
                    {stat.value}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {stat.unit}
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default UnifiedLeaveOverviewStats;