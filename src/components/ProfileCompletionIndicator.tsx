import React from 'react'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface ProfileCompletionIndicatorProps {
  percentage: number
  className?: string
  showLabel?: boolean
}

const ProfileCompletionIndicator: React.FC<ProfileCompletionIndicatorProps> = ({
  percentage,
  className = '',
  showLabel = true
}) => {
  const getStatusColor = () => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-blue-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    if (percentage >= 90) return <CheckCircle className="h-5 w-5" />
    if (percentage >= 50) return <Clock className="h-5 w-5" />
    return <AlertCircle className="h-5 w-5" />
  }

  const getStatusMessage = () => {
    if (percentage >= 90) return 'Complete'
    if (percentage >= 70) return 'Nearly Complete'
    if (percentage >= 50) return 'In Progress'
    return 'Incomplete'
  }

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getBackgroundColor = () => {
    if (percentage >= 90) return 'bg-green-100'
    if (percentage >= 70) return 'bg-blue-100'
    if (percentage >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Progress Circle */}
      <div className="relative flex items-center justify-center">
        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <path
            className="text-gray-200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Progress circle */}
          <path
            className={getProgressColor().replace('bg-', 'text-')}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Status Information */}
      {showLabel && (
        <div className="flex-1">
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-medium text-sm">
              {getStatusMessage()}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Profile completion helps us serve you better
          </p>
        </div>
      )}
    </div>
  )
}

export default ProfileCompletionIndicator
