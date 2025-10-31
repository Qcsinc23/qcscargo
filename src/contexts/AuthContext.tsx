import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isStaff: boolean
  userRole: string | null
  signIn: (email: string, password: string) => Promise<{ data?: unknown; error?: Error }>
  signUp: (email: string, password: string) => Promise<{ data?: unknown; error?: Error }>
  signOut: () => Promise<{ error?: Error }>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Removed hardcoded admin emails - now using JWT-based role storage

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isStaff, setIsStaff] = useState(false)

  // Helper function to determine user role with database verification
  const determineUserRole = async (user: User | null) => {
    if (!user) {
      setUserRole(null)
      setIsAdmin(false)
      setIsStaff(false)
      return
    }

    try {
      // First check user metadata for role with multiple fallbacks
      let role = user.user_metadata?.role ||
                 user.user_metadata?.user_type ||
                 user.app_metadata?.role ||
                 user.app_metadata?.user_type

      // Try database profile lookup ONLY if JWT metadata is missing
      // This prevents infinite recursion in RLS policies
      if (!role) {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('role, user_type')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .single()

          if (!error && profile) {
            // Use database role as authoritative source (handles both columns)
            role = profile.role || profile.user_type
            logger.debug('Database role verification (fallback)', {
              user_id: user.id,
              email: user.email,
              profile_role: profile.role,
              profile_user_type: profile.user_type,
              final_role: role
            })
          } else {
            logger.debug('Profile lookup failed, using metadata role', {
              user_id: user.id,
              email: user.email,
              error: error?.message,
              metadata_role: role
            })
          }
        } catch (dbError) {
          logger.warn('Database profile lookup skipped due to RLS policy conflict', {
            user_id: user.id,
            email: user.email,
            error: dbError instanceof Error ? dbError.message : String(dbError),
            using_jwt_metadata: true
          })
          // Continue with JWT metadata only
        }
      } else {
        logger.debug('Using JWT metadata role (preferred method)', {
          user_id: user.id,
          email: user.email,
          jwt_role: role
        })
      }
      
      // Default to customer if no role found
      if (!role) {
        role = 'customer'
      }
      
      logger.debug('Final role determination', {
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        final_role: role
      })
      
      setUserRole(role)
      setIsAdmin(role === 'admin')
      setIsStaff(role === 'staff' || role === 'admin')
    } catch (error) {
      logger.error('Error determining user role', error, {
        component: 'AuthContext',
        action: 'determineUserRole'
      })
      // Default fallback on any error
      setUserRole('customer')
      setIsAdmin(false)
      setIsStaff(false)
    }
  }

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (user) {
      await determineUserRole(user)
    }
  }

  // Load user on mount (one-time check)
  useEffect(() => {
    async function loadUser() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        await determineUserRole(user)
      } finally {
        setLoading(false)
      }
    }
    loadUser()

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user || null
        setUser(user)
        
        // Handle role determination asynchronously
        if (user) {
          // Don't block the auth state change, but update role in background
          determineUserRole(user).catch(error => {
            logger.error('Error updating user role after auth change', error, {
              component: 'AuthContext',
              action: 'onAuthStateChange'
            })
          })
        } else {
          // Clear role immediately for sign out
          setUserRole(null)
          setIsAdmin(false)
          setIsStaff(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auth methods
  async function signIn(email: string, password: string): Promise<{ data?: unknown; error?: Error }> {
    const result = await supabase.auth.signInWithPassword({ email, password })
    return {
      data: result.data,
      error: result.error ? new Error(result.error.message) : undefined
    }
  }

  async function signUp(email: string, password: string): Promise<{ data?: unknown; error?: Error }> {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
      }
    })
    return {
      data: result.data,
      error: result.error ? new Error(result.error.message) : undefined
    }
  }

  async function signOut(): Promise<{ error?: Error }> {
    const result = await supabase.auth.signOut()
    return {
      error: result.error ? new Error(result.error.message) : undefined
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isStaff,
      userRole,
      signIn,
      signUp,
      signOut,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
