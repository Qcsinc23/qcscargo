import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Serializes error objects for display
 */
const serializeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message + (import.meta.env.DEV ? '\n' + error.stack : '');
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error, null, 2);
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

/**
 * Enhanced Error Boundary component with logging and custom fallback support
 * Use this for route-level error handling
 */
export class RouteErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to monitoring service
    logger.error('Error boundary caught error', error, {
      component: 'RouteErrorBoundary',
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;

      if (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some((key, index) => key !== currentKeys[index])
      ) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent error={this.state.error} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const handleGoHome = (): void => {
    resetError();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-center text-gray-900">
          Something went wrong
        </h1>

        <p className="mt-2 text-center text-gray-600">
          We apologize for the inconvenience. An error occurred while loading this page.
        </p>

        {import.meta.env.DEV && error && (
          <div className="mt-4 p-4 bg-gray-100 rounded border border-gray-300">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Error Details (Development Only):
            </p>
            <pre className="text-xs text-gray-800 overflow-auto max-h-48">
              {serializeError(error)}
            </pre>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        <p className="mt-4 text-xs text-center text-gray-500">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
};

/**
 * Admin-specific error fallback
 */
export const AdminErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const handleGoToDashboard = (): void => {
    resetError();
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-center text-gray-900">
          Admin Dashboard Error
        </h1>

        <p className="mt-2 text-center text-gray-600">
          An error occurred in the admin dashboard. This has been logged for investigation.
        </p>

        {import.meta.env.DEV && error && (
          <div className="mt-4 p-4 bg-gray-100 rounded border border-gray-300">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Error Details:
            </p>
            <pre className="text-xs text-gray-800 overflow-auto max-h-48">
              {serializeError(error)}
            </pre>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </Button>
          <Button
            onClick={handleGoToDashboard}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Customer dashboard error fallback
 */
export const CustomerErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const handleGoToDashboard = (): void => {
    resetError();
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-center text-gray-900">
          Oops! Something went wrong
        </h1>

        <p className="mt-2 text-center text-gray-600">
          We encountered an error while processing your request. Please try again.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            onClick={handleGoToDashboard}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            My Dashboard
          </Button>
        </div>

        <p className="mt-4 text-xs text-center text-gray-500">
          Need help? Contact our support team.
        </p>
      </div>
    </div>
  );
};
