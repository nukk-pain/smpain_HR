import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  AccountBalance,
  BeachAccess,
  Assessment,
  Logout,
  Settings,
  VpnKey,
  Person,
  Business,
  CloudUpload,
  Event,
  Group,
  Edit as EditProfileIcon,
  Folder,
} from '@mui/icons-material'
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

// Base navigation items available to all users
const baseNavigationItems: NavigationItem[] = [
  {
    text: '대시보드',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    text: '내 휴가 관리',
    icon: <BeachAccess />,
    path: '/leave',
    permissions: ['leave:view'],
  },
  {
    text: '휴가 달력',
    icon: <Event />,
    path: '/leave/calendar',
    permissions: ['leave:view', 'leave:manage'],
  },
  {
    text: '내 문서함',
    icon: <Folder />,
    path: '/my-documents',
    permissions: ['leave:view'], // All employees can access
  },
]

// Supervisor-specific navigation items
const supervisorNavigationItems: NavigationItem[] = [
  {
    text: '직원 휴가 현황',
    icon: <Group />,
    path: '/supervisor/leave/status',
    permissions: ['leave:manage'],
  },
  {
    text: '직원 휴가 승인',
    icon: <BeachAccess />,
    path: '/supervisor/leave/requests',
    permissions: ['leave:manage'],
  },
  {
    text: '직원 관리',
    icon: <People />,
    path: '/supervisor/users',
    permissions: ['users:view'],
  },
  {
    text: '부서 관리',
    icon: <Business />,
    path: '/supervisor/departments',
    permissions: ['departments:view', 'departments:manage'],
  },
  {
    text: '급여 관리',
    icon: <AccountBalance />,
    path: '/supervisor/payroll',
    permissions: ['payroll:view', 'payroll:manage'],
  },
  {
    text: '보고서',
    icon: <Assessment />,
    path: '/supervisor/reports',
    permissions: ['reports:view'],
  },
  {
    text: '파일 관리',
    icon: <CloudUpload />,
    path: '/supervisor/files',
    permissions: ['files:view', 'files:manage'],
  },
]

// Admin-specific navigation items (only admin-exclusive features)
const adminNavigationItems: NavigationItem[] = [
  {
    text: '전체 휴가 현황',
    icon: <BeachAccess />,
    path: '/admin/leave/overview',
    permissions: ['admin:permissions'],
  },
  {
    text: '휴가 정책 설정',
    icon: <Settings />,
    path: '/admin/leave/policy',
    permissions: ['admin:permissions'],
  },
  {
    text: '문서 관리',
    icon: <Folder />,
    path: '/admin/documents',
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

  // Build navigation items based on user role
  const navigationItems = React.useMemo(() => {
    if (!user) return baseNavigationItems;
    
    // Start with base items
    let items = [...baseNavigationItems];
    
    // Add role-specific items
    if (user.role === 'admin') {
      // Admin gets both supervisor items and admin-specific items
      items = [...items, ...supervisorNavigationItems, ...adminNavigationItems];
    } else if (user.role === 'supervisor') {
      // Supervisor only gets supervisor items
      items = [...items, ...supervisorNavigationItems];
    }
    
    return items;
  }, [user]);

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
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          통합 관리 시스템
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredNavigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.text || '대시보드'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              color="inherit"
              startIcon={<Avatar sx={{ width: 24, height: 24 }}><Person /></Avatar>}
              onClick={handleProfileMenuOpen}
            >
              {user?.name || '사용자'}
            </Button>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleProfileEdit}>
              <ListItemIcon>
                <EditProfileIcon fontSize="small" />
              </ListItemIcon>
              내 정보 수정
            </MenuItem>
            <MenuItem onClick={handlePasswordChangeOpen}>
              <ListItemIcon>
                <VpnKey fontSize="small" />
              </ListItemIcon>
              비밀번호 변경
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              로그아웃
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Password Change Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={handlePasswordChangeClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>비밀번호 변경</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="현재 비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="새 비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="새 비밀번호 확인"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordChangeClose}>취소</Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            변경
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Layout