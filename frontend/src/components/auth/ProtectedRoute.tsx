import { useEffect, ReactNode, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/lib/stores/auth'
import { AuthApiClient } from '@/lib/api/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: Array<'Admin' | 'Manager' | 'Team'>
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, accessToken, refreshToken, setTokens, setUser } = useAuthStore()
  const location = useLocation()
  const isInitialized = useRef(false)

  // Initialize auth state only once on mount
  useEffect(() => {
    if (isInitialized.current) return
    
    const initializeAuth = async () => {
      // If we have a user and token, we're already authenticated
      if (user && accessToken) {
        isInitialized.current = true
        return
      }

      // If we have a refresh token but no user, try to refresh
      if (!user && refreshToken) {
        try {
          const refreshRes = await AuthApiClient.refresh({ refreshToken })
          setTokens(refreshRes.accessToken)
          
          const userRes = await AuthApiClient.me(refreshRes.accessToken)
          setUser(userRes.user)
        } catch (error) {
          // Refresh failed, clear tokens
          setUser(null)
          setTokens('')
        }
      }
      
      isInitialized.current = true
    }

    initializeAuth()
  }, []) // Empty dependency array - run only once

  // Not authenticated
  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-red-500 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-red-400">
            Required roles: {requiredRoles.join(', ')} | Your role: {user.role}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
