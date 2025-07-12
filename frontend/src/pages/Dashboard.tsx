import React from 'react'
import { useAuth } from '../components/AuthProvider'
import UnifiedDashboard from '../components/UnifiedDashboard'
import UserDashboard from '../components/UserDashboard'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // For admin users, show the full unified dashboard
  // For manager and regular users, show a simplified personal dashboard
  if (user?.role === 'admin') {
    return <UnifiedDashboard />
  }

  // Personal dashboard for manager and regular users
  return <UserDashboard />
}

export default Dashboard