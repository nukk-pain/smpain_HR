import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Login from './pages/Login'

// Lazy load all heavy components to reduce initial bundle size
const Layout = React.lazy(() => import('./components/Layout'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const UserProfile = React.lazy(() => import('./pages/UserProfile'))

// Lazy load heavy components to reduce initial bundle size
const PayrollManagement = React.lazy(() => import('./pages/PayrollManagement'))
const PayrollExcelUploadPage = React.lazy(() => import('./pages/Payroll/PayrollExcelUpload'))
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
const MyDocuments = React.lazy(() => import('./pages/MyDocuments'))
const AdminDocuments = React.lazy(() => import('./pages/AdminDocuments'))
import { NotificationProvider } from './components/NotificationProvider'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, loading } = useAuth()

  // Debug logging for payroll route
  if (window.location.pathname === '/payroll/excel-upload') {
    console.log('🔐 ProtectedRoute for payroll:', {
      isAuthenticated,
      loading,
      userRole: user?.role,
      userName: user?.name,
      allowedRoles,
      hasValidRole: allowedRoles ? (user && allowedRoles.includes(user.role)) : true
    });
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    console.log('🔐 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.log('🔐 ProtectedRoute: Role not allowed, redirecting to dashboard. User role:', user.role, 'Required roles:', allowedRoles);
    return <Navigate to="/dashboard" replace />
  }

  console.log('🔐 ProtectedRoute: Access granted, rendering children');
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
      {/* Test route - FIRST PRIORITY - completely minimal */}
      <Route path="/test-minimal" element={
        <div style={{padding: '20px', backgroundColor: 'lightgreen', minHeight: '100vh'}}>
          <h1>🎯 TEST MINIMAL ROUTE WORKS!</h1>
          <p>This is a completely minimal test route.</p>
          <p>URL: /test-minimal</p>
          <p>No auth, no layout, no complex components.</p>
          <p>Current time: {new Date().toLocaleTimeString()}</p>
        </div>
      } />
      
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      
      {/* Payroll Excel Upload Route - Direct top-level route to avoid conflicts */}
      <Route 
        path="/payroll/excel-upload" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
              <PayrollExcelUploadPage />
            </React.Suspense>
          </ProtectedRoute>
        } 
      />
      
      <Route path="/" element={
        <ProtectedRoute>
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
            <Layout />
          </React.Suspense>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <Dashboard />
          </React.Suspense>
        } />
        
        <Route path="profile" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <UserProfile />
          </React.Suspense>
        } />
        
        <Route path="supervisor/payroll" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
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
        
        <Route path="leave/calendar" element={
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
            <LeaveCalendarPage />
          </React.Suspense>
        } />
        
        <Route path="my-documents" element={
          <ProtectedRoute>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <MyDocuments />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        {/* Redirect old URLs to new structure */}
        <Route path="leave-calendar" element={<Navigate to="/leave/calendar" replace />} />
        <Route path="employee-leave-status" element={<Navigate to="/supervisor/leave/status" replace />} />
        <Route path="employee-leave" element={<Navigate to="/supervisor/leave/requests" replace />} />
        <Route path="admin/leave-overview" element={<Navigate to="/admin/leave/overview" replace />} />
        <Route path="admin/leave-policy" element={<Navigate to="/admin/leave/policy" replace />} />
        
      </Route>
      
      <Route path="/" element={
        <ProtectedRoute>
          <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
            <Layout />
          </React.Suspense>
        </ProtectedRoute>
      }>
        
        {/* Role-based redirects for old management pages - Admin now uses supervisor routes */}
        <Route path="users" element={<Navigate to="/supervisor/users" replace />} />
        <Route path="departments" element={<Navigate to="/supervisor/departments" replace />} />
        {/* Make payroll redirect more specific to avoid matching /payroll/excel-upload */}
        <Route path="payroll" end element={<Navigate to="/supervisor/payroll" replace />} />
        <Route path="reports" element={<Navigate to="/supervisor/reports" replace />} />
        <Route path="files" element={<Navigate to="/supervisor/files" replace />} />
        
        <Route path="supervisor/leave/status" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <TeamLeaveStatusPage />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="supervisor/leave/requests" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <EmployeeLeaveManagement />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="supervisor/users" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <UserManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="supervisor/departments" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <DepartmentManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        
        
        <Route path="supervisor/reports" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <Reports />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="supervisor/files" element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <FileManagement />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        
        
        <Route path="admin/leave/overview" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <AdminLeaveOverview />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="admin/leave/policy" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <AdminLeavePolicy />
            </React.Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="admin/documents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <React.Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>}>
              <AdminDocuments />
            </React.Suspense>
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Catch-all route - MUST be last to avoid overriding specific routes */}
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