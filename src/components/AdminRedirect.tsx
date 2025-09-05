import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface AdminRedirectProps {
  children: React.ReactNode
}

/**
 * Component that redirects admin users to admin dashboard
 * and allows regular users to proceed to customer dashboard
 */
export default function AdminRedirect({ children }: AdminRedirectProps) {
  const { user, loading, isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return
    
    // Only redirect if user is logged in and is an admin
    if (user && isAdmin) {
      console.log('Admin user detected, redirecting to admin dashboard')
      navigate('/admin', { replace: true })
    }
  }, [user, loading, isAdmin, navigate])

  // Don't render children if we're redirecting an admin user
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is admin, don't render children (they should be redirected)
  if (user && isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to admin dashboard...</p>
        </div>
      </div>
    )
  }

  // For regular users, render the customer dashboard
  return <>{children}</>
}
