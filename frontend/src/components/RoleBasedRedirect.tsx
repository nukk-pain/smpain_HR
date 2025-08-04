import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

interface RoleBasedRedirectProps {
  supervisorPath: string
  adminPath: string
}

const RoleBasedRedirect: React.FC<RoleBasedRedirectProps> = ({ 
  supervisorPath, 
  adminPath 
}) => {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // Admin gets admin path, supervisor gets supervisor path
  const redirectPath = user.role === 'admin' ? adminPath : supervisorPath
  
  return <Navigate to={redirectPath} replace />
}

export default RoleBasedRedirect