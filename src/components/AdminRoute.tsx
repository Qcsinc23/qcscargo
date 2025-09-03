import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
  requireStaff?: boolean // If true, allows both staff and admin; if false, requires admin only
}

export default function AdminRoute({ children, requireStaff = false }: AdminRouteProps) {
  const { user, loading, isAdmin, isStaff } = useAuth()
  const location = useLocation()

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

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Check role requirements
  const hasRequiredRole = requireStaff ? isStaff : isAdmin
  
  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access this area. 
            {requireStaff ? 'Staff or admin access is required.' : 'Admin access is required.'}
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
