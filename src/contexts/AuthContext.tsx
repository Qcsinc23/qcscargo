import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isStaff: boolean
  userRole: string | null
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
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

      // Fetch user profile from database for authoritative role information
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, user_type')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .single()

      if (!error && profile) {
        // Use database role as authoritative source (handles both columns)
        role = profile.role || profile.user_type || role
        console.log('Database role verification:', {
          user_id: user.id,
          email: user.email,
          profile_role: profile.role,
          profile_user_type: profile.user_type,
          final_role: role
        })
      } else {
        console.log('Profile lookup failed, using metadata role:', {
          user_id: user.id,
          email: user.email,
          error: error?.message,
          metadata_role: role
        })
      }
      
      // Special cases for admin access (fallback)
      if (!role) {
        if (user.email === 'admin@qcscargo.com' ||
            user.email?.endsWith('@minimax.com') ||
            user.email?.endsWith('@minimaxi.cn')) {
          role = 'admin'
        } else {
          role = 'customer'
        }
      }
      
      console.log('Final role determination:', {
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        database_profile: profile,
        final_role: role
      })
      
      setUserRole(role)
      setIsAdmin(role === 'admin')
      setIsStaff(role === 'staff' || role === 'admin')
    } catch (error) {
      console.error('Error determining user role:', error)
      // Fallback to metadata-based role detection
      let fallbackRole = user.user_metadata?.role ||
                        user.user_metadata?.user_type ||
                        user.app_metadata?.role ||
                        user.app_metadata?.user_type ||
                        'customer'
      
      setUserRole(fallbackRole)
      setIsAdmin(fallbackRole === 'admin')
      setIsStaff(fallbackRole === 'staff' || fallbackRole === 'admin')
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
            console.error('Error updating user role after auth change:', error)
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
  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
      }
    })
  }

  async function signOut() {
    return await supabase.auth.signOut()
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