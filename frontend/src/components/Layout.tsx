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
  Collapse,
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
  ExpandLess,
  ExpandMore,
  Home,
  Description,
  BarChart,
  AttachMoney,
} from '@mui/icons-material'
import { useAuth } from './AuthProvider'
import { useNotification } from './NotificationProvider'
import { apiService } from '../services/api'

const drawerWidth = 240

interface NavigationItem {
  text: string
  path: string
  roles?: string[]
  permissions?: string[]
}

interface NavigationGroup {
  id: string
  title: string
  icon: React.ReactElement
  items: NavigationItem[]
  defaultExpanded?: boolean
}

// Navigation groups structure
const navigationGroups: NavigationGroup[] = [
  {
    id: 'home',
    title: '홈',
    icon: <Home />,
    defaultExpanded: true,
    items: [
      {
        text: '대시보드',
        path: '/dashboard',
      },
    ],
  },
  {
    id: 'personal',
    title: '내 정보',
    icon: <Person />,
    defaultExpanded: false,
    items: [
      {
        text: '내 휴가 관리',
        path: '/leave',
        permissions: ['leave:view'],
      },
      {
        text: '내 문서함',
        path: '/my-documents',
        permissions: ['leave:view'],
      },
    ],
  },
  {
    id: 'leave-management',
    title: '휴가 관리',
    icon: <BeachAccess />,
    defaultExpanded: false,
    items: [
      {
        text: '휴가 달력',
        path: '/leave/calendar',
        permissions: ['leave:view', 'leave:manage'],
      },
    ],
  },
  {
    id: 'organization',
    title: '조직 관리',
    icon: <Group />,
    defaultExpanded: false,
    items: [],
  },
  {
    id: 'payroll',
    title: '급여 관리',
    icon: <AttachMoney />,
    defaultExpanded: false,
    items: [],
  },
  {
    id: 'documents',
    title: '문서 관리',
    icon: <Description />,
    defaultExpanded: false,
    items: [],
  },
  {
    id: 'reports',
    title: '보고서',
    icon: <BarChart />,
    defaultExpanded: false,
    items: [],
  },
  {
    id: 'settings',
    title: '시스템 설정',
    icon: <Settings />,
    defaultExpanded: false,
    items: [],
  },
]

// Supervisor-specific items to be added to groups
const supervisorItems = {
  'leave-management': [
    {
      text: '직원 휴가 현황',
      path: '/supervisor/leave/status',
      permissions: ['leave:manage'],
    },
    {
      text: '직원 휴가 승인',
      path: '/supervisor/leave/requests',
      permissions: ['leave:manage'],
    },
  ],
  'organization': [
    {
      text: '직원 관리',
      path: '/supervisor/users',
      permissions: ['users:view'],
    },
    {
      text: '부서 관리',
      path: '/supervisor/departments',
      permissions: ['departments:view', 'departments:manage'],
    },
  ],
  'payroll': [
    {
      text: '급여 관리',
      path: '/supervisor/payroll',
      permissions: ['payroll:view', 'payroll:manage'],
    },
  ],
  'documents': [
    {
      text: '파일 업로드',
      path: '/supervisor/files',
      permissions: ['files:view', 'files:manage'],
    },
  ],
  'reports': [
    {
      text: '보고서',
      path: '/supervisor/reports',
      permissions: ['reports:view'],
    },
  ],
}

// Admin-specific items to be added to groups
const adminItems = {
  'leave-management': [
    {
      text: '전체 휴가 현황',
      path: '/admin/leave/overview',
      permissions: ['admin:permissions'],
    },
  ],
  'documents': [
    {
      text: '문서 관리',
      path: '/admin/documents',
      permissions: ['admin:permissions'],
    },
  ],
  'settings': [
    {
      text: '휴가 정책 설정',
      path: '/admin/leave/policy',
      permissions: ['admin:permissions'],
    },
  ],
}

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Group expansion state management
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('navigationGroupsExpanded')
    if (saved) {
      return JSON.parse(saved)
    }
    // Default expanded groups
    return navigationGroups
      .filter(group => group.defaultExpanded)
      .map(group => group.id)
  })
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { showSuccess, showError } = useNotification()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups(prev => {
      const newExpanded = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
      
      // Save to localStorage
      localStorage.setItem('navigationGroupsExpanded', JSON.stringify(newExpanded))
      return newExpanded
    })
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

  // Build navigation groups based on user role
  const userNavigationGroups = React.useMemo(() => {
    if (!user) return navigationGroups;
    
    // Clone the navigation groups (cannot use JSON.parse/stringify because of JSX elements)
    const groups = navigationGroups.map(group => ({
      ...group,
      items: [...group.items]
    }))
    
    console.log('🔍 Initial groups:', groups)
    
    // Add role-specific items to groups
    if (user.role === 'admin' || user.role === 'supervisor') {
      // Add supervisor items
      Object.entries(supervisorItems).forEach(([groupId, items]) => {
        const group = groups.find(g => g.id === groupId)
        if (group) {
          group.items.push(...items)
        }
      })
    }
    
    if (user.role === 'admin') {
      // Add admin-specific items
      Object.entries(adminItems).forEach(([groupId, items]) => {
        const group = groups.find(g => g.id === groupId)
        if (group) {
          group.items.push(...items)
        }
      })
    }
    
    // Filter items based on permissions
    groups.forEach(group => {
      group.items = group.items.filter(item => {
        // If no permissions required, show to all users
        if (!item.permissions && !item.roles) {
          return true
        }
        
        // Check role-based access (legacy)
        if (item.roles && item.roles.includes(user.role)) {
          return true
        }
        
        // Check permission-based access
        if (item.permissions && user.permissions) {
          return item.permissions.some(permission => user.permissions.includes(permission))
        }
        
        return false
      })
    })
    
    // Remove empty groups
    return groups.filter(group => group.items.length > 0)
  }, [user])
  
  // Auto-expand group containing current page
  React.useEffect(() => {
    const currentGroup = userNavigationGroups.find(group =>
      group.items.some(item => item.path === location.pathname)
    )
    
    if (currentGroup && !expandedGroups.includes(currentGroup.id)) {
      setExpandedGroups(prev => {
        const newExpanded = [...prev, currentGroup.id]
        localStorage.setItem('navigationGroupsExpanded', JSON.stringify(newExpanded))
        return newExpanded
      })
    }
  }, [location.pathname, userNavigationGroups, expandedGroups])

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          통합 관리 시스템
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ pt: 0 }}>
        {userNavigationGroups.map((group) => (
          <React.Fragment key={group.id}>
            {/* Group Header */}
            <ListItemButton
              onClick={() => handleGroupToggle(group.id)}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                },
                borderLeft: '3px solid',
                borderLeftColor: 'primary.main',
                mt: group.id === userNavigationGroups[0].id ? 0 : 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {group.icon}
              </ListItemIcon>
              <ListItemText 
                primary={group.title} 
                primaryTypographyProps={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              />
              {expandedGroups.includes(group.id) ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            
            {/* Group Items */}
            <Collapse in={expandedGroups.includes(group.id)} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.items.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        pl: 6,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        },
                      }}
                    >
                      <ListItemText 
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
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
            {(() => {
              for (const group of userNavigationGroups) {
                const item = group.items.find(item => item.path === location.pathname)
                if (item) return item.text
              }
              return '대시보드'
            })()}
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