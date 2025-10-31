/**
 * Enhanced error handling utilities
 * Based on BookingPage error handling pattern
 */

import { toast } from 'sonner'

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export const handleShipmentError = (error: unknown, context?: Record<string, unknown>): string => {
  const errorMessage = getErrorMessage(error).toLowerCase()
  
  // Validation errors
  if (errorMessage.includes('required') || errorMessage.includes('missing')) {
    toast.error('Missing Required Fields', {
      description: 'Please fill in all required fields before submitting.',
      duration: 5000
    })
    return 'Please fill in all required fields'
  }
  
  // Destination errors
  if (errorMessage.includes('destination') || errorMessage.includes('invalid destination')) {
    toast.error('Invalid Destination', {
      description: 'The selected destination is invalid. Please choose a different destination.',
      duration: 5000
    })
    return 'Invalid destination selected. Please choose a different destination.'
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('auth') || errorMessage.includes('session')) {
    toast.error('Authentication Required', {
      description: 'Your session has expired. Please log in again.',
      duration: 5000
    })
    return 'Your session has expired. Please log in again.'
  }
  
  // Network/connectivity errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
    toast.error('Connection Problem', {
      description: 'Unable to connect to our servers. Please check your internet connection and try again.',
      duration: 5000
    })
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  // Server errors
  if (errorMessage.includes('server') || errorMessage.includes('internal') || errorMessage.includes('500')) {
    toast.error('Server Error', {
      description: 'Our servers are experiencing issues. Please try again in a few minutes.',
      duration: 5000
    })
    return 'Server error occurred. Please try again in a few minutes.'
  }
  
  // Database errors
  if (errorMessage.includes('foreign key') || errorMessage.includes('constraint') || errorMessage.includes('database')) {
    toast.error('Data Error', {
      description: 'There was an issue with the data. Please check your selections and try again.',
      duration: 5000
    })
    return 'Data validation error. Please check your selections and try again.'
  }
  
  // Generic error
  toast.error('Operation Failed', {
    description: errorMessage || 'Please try again or contact support if the problem persists.',
    duration: 5000
  })
  return errorMessage || 'An unexpected error occurred. Please try again.'
}

export const handleAdminError = (error: unknown, action: string): string => {
  const errorMessage = getErrorMessage(error).toLowerCase()
  
  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    toast.error('Access Denied', {
      description: 'You do not have permission to perform this action.',
      duration: 5000
    })
    return 'You do not have permission to perform this action.'
  }
  
  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    toast.error('Not Found', {
      description: 'The requested item could not be found.',
      duration: 5000
    })
    return 'The requested item could not be found.'
  }
  
  // Use generic handler for others
  return handleShipmentError(error)
}

