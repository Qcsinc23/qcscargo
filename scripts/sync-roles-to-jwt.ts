/**
 * Script to sync user_profiles.role to JWT user_metadata
 * This ensures RLS policies work correctly by having role in JWT claims
 *
 * Usage: npx tsx scripts/sync-roles-to-jwt.ts
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface UserProfile {
  id: string
  user_id?: string
  role: string
  email?: string
  first_name?: string
  last_name?: string
}

async function syncRolesToJWT() {
  console.log('🔄 Starting role sync to JWT metadata...\n')

  try {
    // Fetch all user profiles with roles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, role, email, first_name, last_name')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No user profiles found')
      return
    }

    console.log(`Found ${profiles.length} user profiles\n`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each profile
    for (const profile of profiles as UserProfile[]) {
      const userId = profile.user_id || profile.id
      const role = profile.role || 'customer'

      try {
        // Update user metadata with role
        const { data, error } = await supabase.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              role: role
            }
          }
        )

        if (error) {
          errorCount++
          const errorMsg = `Failed to update ${profile.email || userId}: ${error.message}`
          errors.push(errorMsg)
          console.log(`✗ ${errorMsg}`)
        } else {
          successCount++
          console.log(`✓ Updated ${profile.email || userId} with role: ${role}`)
        }
      } catch (err) {
        errorCount++
        const errorMsg = `Exception updating ${profile.email || userId}: ${err}`
        errors.push(errorMsg)
        console.log(`✗ ${errorMsg}`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Sync Summary')
    console.log('='.repeat(60))
    console.log(`Total profiles: ${profiles.length}`)
    console.log(`✓ Successful: ${successCount}`)
    console.log(`✗ Failed: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(err => console.log(`   - ${err}`))
    }

    console.log('\n✅ Role sync completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Ask users to log out and log back in')
    console.log('2. JWT tokens will now include role claims')
    console.log('3. RLS policies will work correctly')

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the sync
syncRolesToJWT()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
