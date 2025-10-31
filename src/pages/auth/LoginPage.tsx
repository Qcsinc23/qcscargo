import React, { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { logAuthError, logValidationError } from '../../lib/errorLogger'
import { logger } from '@/lib/logger'

interface LocationState {
  from?: {
    pathname: string
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  const state = location.state as LocationState
  // Check for returnUrl in search params or fall back to location state or default dashboard
  const returnUrl = searchParams.get('returnUrl')
  const from = returnUrl || state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Client-side validation
    if (!email.trim()) {
      const error = 'Email is required'
      setError(error)
      await logValidationError(error, 'email', 'empty_email')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      const error = 'Password is required'
      setError(error)
      await logValidationError(error, 'password', 'empty_password')
      setLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const error = 'Please enter a valid email address'
      setError(error)
      await logValidationError(error, 'email', email)
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(email, password)
      if (error) {
        logger.error('Sign in error', error, {
          component: 'LoginPage',
          action: 'handleSubmit'
        })
        await logAuthError(error, 'login', email)
        
        // Provide user-friendly error messages with comprehensive rate limiting handling
        let errorMessage = error.message
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the verification link before signing in.'
        } else if (error.message.includes('Too many requests') || error.message.includes('Too many login attempts')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.'
        } else if (error.message.includes('For security purposes, you can only request this after')) {
          errorMessage = 'Please wait a moment before trying again. This helps us keep your account secure.'
        } else if (error.message.includes('User not found')) {
          errorMessage = 'No account found with this email address. Please check your email or create a new account.'
        } else if (error.status === 429) {
          errorMessage = 'Login temporarily limited. Please wait a moment and try again.'
        } else if (error.message.includes('signup disabled')) {
          errorMessage = 'Account registration is currently disabled. Please contact support.'
        }
        
        setError(errorMessage)
      } else {
        logger.debug('Sign in successful, redirecting', {
          component: 'LoginPage',
          action: 'handleSubmit',
          redirectTo: from
        })
        navigate(from, { replace: true })
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Login error', error, {
        component: 'LoginPage',
        action: 'handleSubmit'
      })
      await logAuthError(error.message, 'login', email)
      setError(error.message || 'An unexpected error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100/30 to-pink-100/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <img
              src="/qcs-logo.svg"
              alt="QCS Cargo - Precision Air Cargo Solutions"
              className="h-16 w-auto mx-auto mb-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/QCS_Cargo_Logo.png";
              }}
            />
            <h1 className="text-3xl font-bold text-rose-900">QCS Cargo</h1>
          </Link>
          <p className="text-pink-600 mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your shipping dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-pink-600">
                Don't have an account?{' '}
                <Link to="/auth/register" className="text-pink-700 hover:underline font-medium">
                  Create one here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-pink-600 hover:text-rose-700">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  )
}