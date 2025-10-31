import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable PKCE flow for better security
    flowType: 'pkce',
    // Auto refresh tokens
    autoRefreshToken: true,
    // Persist session in local storage
    persistSession: true,
    // Detect session from URL parameters
    detectSessionInUrl: true,
    // Storage for session persistence
    storage: window.localStorage
  }
})

// Helper functions
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    logger.error('Error getting user', error, {
      component: 'supabase',
      action: 'getCurrentUser'
    })
    return null
  }
  return user
}
