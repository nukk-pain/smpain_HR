import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Upload,
  BarChart3,
} from 'lucide-react'
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


const PayrollManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard')
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

  const handleTabChange = (value: string) => {
    setCurrentTab(value)
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
  }> = ({ title, value, icon, color = 'primary' }) => {
    const iconColorClass = color === 'primary' ? 'text-blue-500' : 
                          color === 'secondary' ? 'text-purple-500' : 
                          color === 'success' ? 'text-green-500' : 
                          color === 'warning' ? 'text-yellow-500' : 
                          color === 'info' ? 'text-cyan-500' : 'text-gray-500'

    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {title}
              </p>
              <div className="text-2xl font-semibold">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {typeof value === 'number' && '원'}
              </div>
            </div>
            <div className={cn(iconColorClass, 'text-3xl')}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          급여 관리
        </h1>
        <Badge variant="outline" className="text-blue-600 border-blue-300">
          {user?.role === 'admin' ? '관리자' : '매니저'}
        </Badge>
      </div>

      {/* Statistics Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="총 직원 수"
            value={dashboardStats.total_employees}
            icon={<Users />}
          />
          <StatCard
            title="당월 총 급여"
            value={dashboardStats.total_payroll}
            icon={<DollarSign />}
            color="success"
          />
          <StatCard
            title="대기 중인 업로드"
            value={dashboardStats.pending_uploads}
            icon={<Upload />}
            color="warning"
          />
          <StatCard
            title="현재 월"
            value={dashboardStats.current_month}
            icon={<TrendingUp />}
            color="info"
          />
        </div>
      )}

      {/* Month Selection */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="outline" onClick={handlePreviousMonth}>
              이전 월
            </Button>
            <div className="space-y-2">
              <Label htmlFor="month-select">조회 월</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="min-w-40"
              />
            </div>
            <Button variant="outline" onClick={handleNextMonth}>
              다음 월
            </Button>
            <Separator orientation="vertical" className="h-8 mx-2" />
            {stats && (
              <div className="flex gap-4 items-center">
                <span className="text-sm text-gray-600">
                  직원 수: {stats.employee_count}명
                </span>
                <span className="text-sm text-gray-600">
                  총 지급액: {stats.grand_total.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6 gap-1">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="payroll">급여 현황</TabsTrigger>
            <TabsTrigger value="sales">매출 관리</TabsTrigger>
            <TabsTrigger value="bonus">상여금/포상금</TabsTrigger>
            <TabsTrigger value="incentive">인센티브 계산</TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="upload">파일 업로드</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="p-4">
            <PayrollDashboard 
              yearMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          </TabsContent>

          <TabsContent value="payroll" className="p-4">
            <PayrollGrid 
              yearMonth={selectedMonth} 
              onDataChange={loadPayrollStats}
            />
          </TabsContent>

          <TabsContent value="sales" className="p-4">
            <SalesManagement yearMonth={selectedMonth} />
          </TabsContent>

          <TabsContent value="bonus" className="p-4">
            <BonusManagement yearMonth={selectedMonth} />
          </TabsContent>

          <TabsContent value="incentive" className="p-4">
            <IncentiveCalculator />
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="upload" className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Excel 파일 업로드
                </h3>
                <p className="text-gray-600">
                  노무사가 제공한 급여 확정 Excel 파일을 업로드하여 검증합니다.
                  파일 관리 메뉴에서 더 자세한 기능을 사용할 수 있습니다.
                </p>
                <Button
                  onClick={() => window.location.href = '/files'}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  파일 관리로 이동
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </Card>
    </div>
  )
}

export default PayrollManagement