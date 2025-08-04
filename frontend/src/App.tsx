import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserProfile from './pages/UserProfile'

// Lazy load heavy components to reduce initial bundle size
const PayrollManagement = React.lazy(() => import('./pages/PayrollManagement'))
const LeaveManagement = React.lazy(() => import('./pages/LeaveManagement'))
const EmployeeLeaveManagement = React.lazy(() => import('./pages/EmployeeLeaveManagement'))
const LeaveCalendarPage = React.lazy(() => import('./pages/LeaveCalendarPage'))
const TeamLeaveStatusPage = React.lazy(() => import('./pages/TeamLeaveStatusPage'))
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'))
const DepartmentManagementPage = React.lazy(() => import('./pages/DepartmentManagementPage'))
const Reports = React.lazy(() => import('./pages/Reports'))
const FileManagement = React.lazy(() => import('./pages/FileManagement'))
const AdminLeaveOverview = React.lazy(() => import('./pages/AdminLeaveOverview'))
const AdminLeavePolicy = React.lazy(() => import('./pages/AdminLeavePolicy'))
import { NotificationProvider } from './components/NotificationProvider'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Main App Content
const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="profile" element={<UserProfile />} />
        
        <Route path="payroll" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <PayrollManagement />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="leave" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <LeaveManagement />
          </React.Suspense>
        } />
        
        <Route path="employee-leave" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <EmployeeLeaveManagement />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="leave-calendar" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <LeaveCalendarPage />
          </React.Suspense>
        } />
        
        <Route path="team-leave-status" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <TeamLeaveStatusPage />
          </React.Suspense>
        } />
        
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <UserManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="departments" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <DepartmentManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <Reports />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="files" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <FileManagement />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="admin/leave-overview" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <AdminLeaveOverview />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="admin/leave-policy" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <AdminLeavePolicy />
            </React.Suspense>
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// Main App Component
const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App