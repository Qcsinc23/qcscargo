import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        const url = new URL(window.location.href)
        const urlParams = url.searchParams
        const hashFragment = url.hash
        
        // Debug information
        const debugDetails = {
          fullUrl: window.location.href,
          searchParams: Object.fromEntries(urlParams.entries()),
          hash: hashFragment,
          hasCode: urlParams.has('code'),
          hasError: urlParams.has('error')
        }
        setDebugInfo(JSON.stringify(debugDetails, null, 2))
        console.log('Auth callback debug info:', debugDetails)
        
        // Handle error in URL parameters first
        if (urlParams.has('error')) {
          const error = urlParams.get('error')
          const errorDescription = urlParams.get('error_description')
          setStatus('error')
          setMessage(`Authentication error: ${errorDescription || error}`)
          return
        }
        
        // Handle PKCE flow with code parameter
        if (urlParams.has('code')) {
          console.log('Processing PKCE flow with code parameter')
          
          // For PKCE flow, we need to use the full URL search string
          const { data, error } = await supabase.auth.exchangeCodeForSession(url.search)
          
          if (error) {
            console.error('PKCE flow error:', error)
            setStatus('error')
            setMessage(`PKCE Authentication failed: ${error.message}`)
            return
          }
          
          if (data?.session) {
            console.log('PKCE flow successful, session created')
            setStatus('success')
            setMessage('Successfully signed in! Redirecting to your dashboard...')
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true })
            }, 2000)
            return
          }
        }
        
        // Handle legacy hash-based flow (fallback)
        if (hashFragment && hashFragment.length > 1) {
          console.log('Processing legacy hash-based flow')
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(hashFragment)

          if (error) {
            console.error('Hash flow error:', error)
            setStatus('error')
            setMessage(`Hash Authentication failed: ${error.message}`)
            return
          }

          if (data?.session) {
            console.log('Hash flow successful, session created')
            setStatus('success')
            setMessage('Successfully signed in! Redirecting to your dashboard...')
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true })
            }, 2000)
            return
          }
        }
        
        // Try to get existing session as last resort
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          console.log('Found existing session')
          setStatus('success')
          setMessage('Session found! Redirecting to your dashboard...')
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 2000)
          return
        }

        // If we get here, no valid authentication was found
        console.log('No valid authentication found')
        setStatus('error')
        setMessage('No valid authentication code or session found. Please try signing in again.')
        
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage(`Unexpected error during authentication: ${error.message}`)
      }
    }

    handleAuthCallback()
  }, [navigate])

  const handleRetry = () => {
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your account...'}
            {status === 'success' && 'Your account has been verified successfully.'}
            {status === 'error' && 'There was a problem verifying your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              {message}
            </p>
            
            {status === 'error' && (
              <div className="space-y-4">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                
                {/* Debug information for development */}
                {debugInfo && process.env.NODE_ENV === 'development' && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Debug Information
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto max-h-40">
                      {debugInfo}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {status === 'success' && (
              <div className="text-sm text-green-600">
                Redirecting to your dashboard...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}