import React from 'react'
import { CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  label: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  completedSteps?: number[]
  className?: string
}

export function StepIndicator({ steps, currentStep, completedSteps = [], className }: StepIndicatorProps) {
  const isCompleted = (stepIndex: number) => completedSteps.includes(stepIndex) || stepIndex < currentStep
  const isCurrent = (stepIndex: number) => stepIndex === currentStep

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                    isCompleted(index)
                      ? "bg-green-500 border-green-500 text-white"
                      : isCurrent(index)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  )}
                >
                  {isCompleted(index) ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
              </div>
              
              {/* Step Label */}
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    "text-sm font-medium",
                    isCurrent(index) ? "text-blue-600" : isCompleted(index) ? "text-green-600" : "text-gray-500"
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-1">{step.description}</div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5">
                <div
                  className={cn(
                    "h-full transition-colors",
                    isCompleted(index) ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  )
}

