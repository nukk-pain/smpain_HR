import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Skeleton
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface RiskDistribution {
  high: number;
  medium: number;
  low: number;
}

interface DepartmentStat {
  department: string;
  avgUsage: number;
  totalEmployees: number;
}

interface Statistics {
  totalEmployees: number;
  averageUsage: number;
  highRiskCount: number;
  pendingRequests: number;
}

interface LeaveAnalyticsChartsProps {
  riskDistribution?: RiskDistribution;
  departmentStats?: DepartmentStat[];
  statistics?: Statistics;
  isLoading?: boolean;
}

const COLORS = {
  high: '#f44336',
  medium: '#ff9800', 
  low: '#4caf50'
};

const getRiskLevelLabel = (level: string): string => {
  switch (level) {
    case 'high': return '높음';
    case 'medium': return '중간';
    case 'low': return '낮음';
    default: return level;
  }
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Box>
        <Typography color="textSecondary" gutterBottom variant="body2">
          {title}
        </Typography>
        <Typography variant="h5" component="div" fontWeight="bold">
          {value}
        </Typography>
      </Box>
      <Box sx={{ color }}>
        {icon}
      </Box>
    </Box>
  </Paper>
);

export const LeaveAnalyticsCharts: React.FC<LeaveAnalyticsChartsProps> = ({
  riskDistribution,
  departmentStats,
  statistics,
  isLoading = false
}) => {
  // Handle empty state
  if (!riskDistribution && !departmentStats && !statistics && !isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" align="center" color="textSecondary">
            데이터가 없습니다
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Prepare pie chart data
  const pieData = riskDistribution
    ? Object.entries(riskDistribution).map(([key, value]) => ({
        name: getRiskLevelLabel(key),
        value,
        color: COLORS[key as keyof typeof COLORS]
      }))
    : [];

  // Loading state
  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={300} />
        </Grid>
      </Grid>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="전체 직원"
              value={`${statistics.totalEmployees}명`}
              icon={<PeopleIcon fontSize="large" />}
              color="#2196f3"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="평균 사용률"
              value={`${statistics.averageUsage}%`}
              icon={<TrendingUpIcon fontSize="large" />}
              color="#4caf50"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="고위험 직원"
              value={`${statistics.highRiskCount}명`}
              icon={<WarningIcon fontSize="large" />}
              color="#f44336"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="대기중 요청"
              value={`${statistics.pendingRequests}건`}
              icon={<ScheduleIcon fontSize="large" />}
              color="#ff9800"
            />
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Risk Distribution Pie Chart */}
        {riskDistribution && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  위험도 분포
                </Typography>
                <Box data-testid="risk-distribution-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => 
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Department Usage Bar Chart */}
        {departmentStats && departmentStats.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  부서별 연차 사용률
                </Typography>
                <Box data-testid="department-usage-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={departmentStats}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="department"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="avgUsage" 
                        fill="#8884d8" 
                        name="평균 사용률(%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};