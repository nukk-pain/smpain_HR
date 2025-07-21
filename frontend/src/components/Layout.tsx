import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Menu as MenuIcon,
  LayoutDashboard as Dashboard,
  Users as People,
  Building as AccountBalance,
  Umbrella as BeachAccess,
  BarChart3 as Assessment,
  LogOut as Logout,
  Settings,
  Key as VpnKey,
  User as Person,
  Building as Business,
  Upload as CloudUpload,
  Calendar as Event,
  Users as Group,
  Edit as EditProfileIcon,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useNotification } from './NotificationProvider'
import { apiService } from '../services/api'

const drawerWidth = 240

interface NavigationItem {
  text: string
  icon: React.ReactElement
  path: string
  roles?: string[]
  permissions?: string[]
}

const navigationItems: NavigationItem[] = [
  {
    text: '대시보드',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    text: '급여 관리',
    icon: <AccountBalance />,
    path: '/payroll',
    permissions: ['payroll:view', 'payroll:manage'],
  },
  {
    text: '내 휴가 관리',
    icon: <BeachAccess />,
    path: '/leave',
    permissions: ['leave:view'],
  },
  {
    text: '직원 휴가 관리',
    icon: <BeachAccess />,
    path: '/employee-leave',
    permissions: ['leave:manage'],
  },
  {
    text: '휴가 달력',
    icon: <Event />,
    path: '/leave-calendar',
    permissions: ['leave:view', 'leave:manage'],
  },
  {
    text: '전체 직원 휴가 현황',
    icon: <Group />,
    path: '/team-leave-status',
    permissions: ['leave:manage'],
  },
  {
    text: '직원 관리',
    icon: <People />,
    path: '/users',
    permissions: ['users:view'],
  },
  {
    text: '부서 관리',
    icon: <Business />,
    path: '/departments',
    permissions: ['departments:view', 'departments:manage'],
  },
  {
    text: '보고서',
    icon: <Assessment />,
    path: '/reports',
    permissions: ['reports:view'],
  },
  {
    text: '파일 관리',
    icon: <CloudUpload />,
    path: '/files',
    permissions: ['files:view', 'files:manage'],
  },
  {
    text: '관리자 휴가 현황',
    icon: <BeachAccess />,
    path: '/admin/leave-overview',
    permissions: ['admin:permissions'],
  },
  {
    text: '휴가 정책 설정',
    icon: <Settings />,
    path: '/admin/leave-policy',
    permissions: ['admin:permissions'],
  },
]

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { showSuccess, showError } = useNotification()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handlePasswordChangeOpen = () => {
    setPasswordDialogOpen(true)
    setAnchorEl(null)
  }

  const handlePasswordChangeClose = () => {
    setPasswordDialogOpen(false)
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  const handleProfileEdit = () => {
    navigate('/profile')
    setAnchorEl(null)
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError('모든 필드를 입력해주세요.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      await apiService.changePassword(passwordData.currentPassword, passwordData.newPassword)
      showSuccess('비밀번호가 성공적으로 변경되었습니다.')
      handlePasswordChangeClose()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '비밀번호 변경 중 오류가 발생했습니다.'
      showError(errorMessage)
    }
  }

  const handleLogout = async () => {
    handleProfileMenuClose()
    await logout()
    showSuccess('로그아웃되었습니다')
    navigate('/login')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  const filteredNavigationItems = navigationItems.filter(item => {
    // If no permissions required, show to all users
    if (!item.permissions && !item.roles) {
      return true;
    }
    
    // Check role-based access (legacy)
    if (item.roles && user && item.roles.includes(user.role)) {
      return true;
    }
    
    // Check permission-based access
    if (item.permissions && user && user.permissions) {
      return item.permissions.some(permission => user.permissions.includes(permission));
    }
    
    return false;
  })

  const drawer = (
    <div>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold truncate">
          통합 관리 시스템
        </h2>
      </div>
      <nav className="p-2">
        {filteredNavigationItems.map((item) => (
          <button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="h-5 w-5 flex items-center justify-center">
              {item.icon}
            </span>
            <span className="truncate">{item.text}</span>
          </button>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-60 border-r">
        {drawer}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          {drawer}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={handleDrawerToggle}
              aria-label="menu"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold truncate">
              {navigationItems.find(item => item.path === location.pathname)?.text || '대시보드'}
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    <Person className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user?.name || '사용자'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleProfileEdit}>
                <EditProfileIcon className="mr-2 h-4 w-4" />
                내 정보 수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePasswordChangeOpen}>
                <VpnKey className="mr-2 h-4 w-4" />
                비밀번호 변경
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <Logout className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => !open && handlePasswordChangeClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePasswordChangeClose}>
              취소
            </Button>
            <Button 
              onClick={handlePasswordChange}
              disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Layout