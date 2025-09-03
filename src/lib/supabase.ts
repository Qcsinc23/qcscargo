import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jsdfltrkpaqdjnofwmug.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZGZsdHJrcGFxZGpub2Z3bXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzEwNTMsImV4cCI6MjA3MjQ0NzA1M30.TQSsz52XF0dwL_1C61mLgZ4pS_NvE97PGl0VSjsOHXk'

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
    console.error('Error getting user:', error)
    return null
  }
  return user
}