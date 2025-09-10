import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, Building, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAuthError, logDatabaseError, logValidationError } from '../../lib/errorLogger'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    address: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      const error = 'Passwords do not match'
      setError(error)
      await logValidationError(error, 'confirmPassword', 'passwords_mismatch')
      setLoading(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      const error = 'Password must be at least 6 characters long'
      setError(error)
      await logValidationError(error, 'password', `length_${formData.password.length}`)
      setLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      const error = 'Please enter a valid email address'
      setError(error)
      await logValidationError(error, 'email', formData.email)
      setLoading(false)
      return
    }

    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      const error = 'First name and last name are required'
      setError(error)
      await logValidationError(error, 'name', 'missing_required_fields')
      setLoading(false)
      return
    }

    try {
      // Sign up user
      const { data, error: signUpError } = await signUp(formData.email, formData.password)
      
      if (signUpError) {
        console.error('Sign up error:', signUpError)
        await logAuthError(signUpError, 'register', formData.email)
        
        // Provide user-friendly error messages
        let errorMessage = signUpError.message
        if (signUpError.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please try signing in instead.'
        } else if (signUpError.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.'
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        }
        
        setError(errorMessage)
        return
      }

      if (data.user) {
        // Create user profile with proper field mapping
        const profileData = {
          user_id: data.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          company_name: formData.companyName || null,
          address: formData.address || null,
          role: 'customer',
          status: 'active',
          country: 'United States'
        }

        console.log('Creating user profile with data:', profileData)

        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert(profileData)

        if (profileError) {
          console.error('Profile creation error:', profileError)
          await logDatabaseError(profileError, 'user_profiles', 'insert', profileData)
          
          // Show user-friendly error message
          let errorMessage = 'Registration completed but profile creation failed. '
          if (profileError.code === '23505') {
            errorMessage += 'An account with this email already exists.'
          } else if (profileError.code === '23502') {
            errorMessage += 'Missing required information.'
          } else if (profileError.code === '42501') {
            errorMessage += 'Permission denied. Please try again.'
          } else {
            errorMessage += `Error: ${profileError.message}`
          }
          errorMessage += ' Please contact support if this issue persists.'
          
          setError(errorMessage)
          return
        }

        console.log('User profile created successfully')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/auth/login', {
          state: {
            message: 'Registration successful! Please check your email to verify your account.'
          }
        })
      }, 3000)

    } catch (err: any) {
      console.error('Registration error:', err)
      await logAuthError(err, 'register', formData.email)
      setError(err.message || 'An unexpected error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100/30 to-pink-100/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-rose-900">Registration Successful!</CardTitle>
            <CardDescription>
              Please check your email for a verification link before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-pink-600 mb-4">
              We've sent a verification email to <strong>{formData.email}</strong>
            </p>
            <Button 
              onClick={() => navigate('/auth/login')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100/30 to-pink-100/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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
          <p className="text-pink-600 mt-2">Create your shipping account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Sign up to start managing your shipments with QCS Cargo
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Your Company LLC"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="123 Main St, City, State 12345"
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500">Optional - can be added later in your profile</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-pink-600">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-pink-700 hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-pink-500 hover:text-pink-700">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  )
}