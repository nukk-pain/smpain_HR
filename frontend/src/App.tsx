import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PayrollManagement from './pages/PayrollManagement'
import LeaveManagement from './pages/LeaveManagement'
import EmployeeLeaveManagement from './pages/EmployeeLeaveManagement'
import LeaveCalendarPage from './pages/LeaveCalendarPage'
import TeamLeaveStatusPage from './pages/TeamLeaveStatusPage'
import UserManagementPage from './pages/UserManagementPage'
import DepartmentManagementPage from './pages/DepartmentManagementPage'
import Reports from './pages/Reports'
import FileManagement from './pages/FileManagement'
import AdminLeaveOverview from './pages/AdminLeaveOverview'
import AdminLeavePolicy from './pages/AdminLeavePolicy'
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
        
        <Route path="payroll" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <PayrollManagement />
          </ProtectedRoute>
        } />
        
        <Route path="leave" element={<LeaveManagement />} />
        
        <Route path="employee-leave" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <EmployeeLeaveManagement />
          </ProtectedRoute>
        } />
        
        <Route path="leave-calendar" element={<LeaveCalendarPage />} />
        
        <Route path="team-leave-status" element={<TeamLeaveStatusPage />} />
        
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <UserManagementPage />
          </ProtectedRoute>
        } />
        
        <Route path="departments" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <DepartmentManagementPage />
          </ProtectedRoute>
        } />
        
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Reports />
          </ProtectedRoute>
        } />
        
        <Route path="files" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <FileManagement />
          </ProtectedRoute>
        } />
        
        <Route path="admin/leave-overview" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLeaveOverview />
          </ProtectedRoute>
        } />
        
        <Route path="admin/leave-policy" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLeavePolicy />
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