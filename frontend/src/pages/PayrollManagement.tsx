import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
} from '@mui/material'
import { Grid } from '@mui/material'
import {
  Add,
  TrendingUp,
  People,
  AttachMoney,
  FileUpload,
  Assessment,
} from '@mui/icons-material'
import { format, subMonths, addMonths } from 'date-fns'
import PayrollGrid from '@/components/PayrollGrid'
import PayrollDashboard from '@/components/PayrollDashboard'
import BonusManagement from '@/components/BonusManagement'
import SalesManagement from '@/components/SalesManagement'
import IncentiveCalculator from '@/components/IncentiveCalculator'
import { useAuth } from '@/components/AuthProvider'
import { useNotification } from '@/components/NotificationProvider'
import apiService from '@/services/api'
import { DashboardStats, PayrollStats } from '@/types'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payroll-tabpanel-${index}`}
      aria-labelledby={`payroll-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const PayrollManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [stats, setStats] = useState<PayrollStats | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    try {
      const response = await apiService.getDashboardStats()
      if (response.success) {
        setDashboardStats(response.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  }

  // Load payroll statistics for selected month
  const loadPayrollStats = async () => {
    try {
      const response = await apiService.getPayrollStats(selectedMonth)
      if (response.success) {
        setStats(response.data)
      } else {
        setStats(null)
      }
    } catch (error: any) {
      // Don't log errors for missing data (404), only for actual errors
      if (error.response?.status !== 404) {
        console.error('Failed to load payroll stats:', error)
      }
      setStats(null)
    }
  }

  useEffect(() => {
    loadDashboardStats()
  }, [])

  useEffect(() => {
    loadPayrollStats()
  }, [selectedMonth])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
  }

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value)
  }

  const handlePreviousMonth = () => {
    const date = new Date(selectedMonth + '-01')
    const prevMonth = subMonths(date, 1)
    setSelectedMonth(format(prevMonth, 'yyyy-MM'))
  }

  const handleNextMonth = () => {
    const date = new Date(selectedMonth + '-01')
    const nextMonth = addMonths(date, 1)
    setSelectedMonth(format(nextMonth, 'yyyy-MM'))
  }

  const StatCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactNode
    color?: string
  }> = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {typeof value === 'number' && value !== null && value !== undefined ? value.toLocaleString() : (value || '0')}
              {typeof value === 'number' && '원'}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          급여 관리
        </Typography>
        <Chip 
          label={user?.role === 'admin' ? '관리자' : '매니저'} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* Statistics Cards */}
      {dashboardStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="총 직원 수"
              value={dashboardStats.total_employees}
              icon={<People fontSize="large" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="당월 총 급여"
              value={dashboardStats.total_payroll}
              icon={<AttachMoney fontSize="large" />}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="대기 중인 업로드"
              value={dashboardStats.pending_uploads}
              icon={<FileUpload fontSize="large" />}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="현재 월"
              value={dashboardStats.current_month}
              icon={<TrendingUp fontSize="large" />}
              color="info"
            />
          </Grid>
        </Grid>
      )}

      {/* Month Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={handlePreviousMonth}>
            이전 월
          </Button>
          <TextField
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            label="조회 월"
            sx={{ minWidth: 160 }}
          />
          <Button variant="outlined" onClick={handleNextMonth}>
            다음 월
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          {stats && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                직원 수: {stats.employee_count || 0}명
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 지급액: {stats.grand_total && typeof stats.grand_total === 'number' ? stats.grand_total.toLocaleString() : '0'}원
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="payroll management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="대시보드" />
          <Tab label="급여 현황" />
          <Tab label="매출 관리" />
          <Tab label="상여금/포상금" />
          <Tab label="인센티브 계산" />
          {user?.role === 'admin' && <Tab label="파일 업로드" />}
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <PayrollDashboard 
            yearMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <PayrollGrid 
            yearMonth={selectedMonth} 
            onDataChange={loadPayrollStats}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <SalesManagement yearMonth={selectedMonth} />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <BonusManagement yearMonth={selectedMonth} />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <IncentiveCalculator />
        </TabPanel>

        {user?.role === 'admin' && (
          <TabPanel value={currentTab} index={5}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Excel 파일 업로드
              </Typography>
              <Typography color="text.secondary">
                노무사가 제공한 급여 확정 Excel 파일을 업로드하여 검증합니다.
                파일 관리 메뉴에서 더 자세한 기능을 사용할 수 있습니다.
              </Typography>
              <Button
                variant="contained"
                startIcon={<FileUpload />}
                sx={{ mt: 2 }}
                onClick={() => window.location.href = user?.role === 'admin' ? '/admin/files' : '/supervisor/files'}
              >
                파일 관리로 이동
              </Button>
            </Box>
          </TabPanel>
        )}
      </Paper>
    </Box>
  )
}

export default PayrollManagement