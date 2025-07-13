/**
 * Lazy Component Wrapper
 * 
 * Provides lazy loading functionality for React components
 * with loading states and error boundaries for better performance.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import React, { Suspense, lazy, Component } from 'react';
import type { ReactNode, ComponentType } from 'react';

interface LazyComponentState {
  hasError: boolean;
}

/**
 * Error Boundary for lazy loaded components
 */
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  LazyComponentState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): LazyComponentState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-gray-600">Something went wrong loading this component.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Default loading component
 */
const DefaultLoading: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

/**
 * Lazy Component wrapper with error boundary and loading state
 * 
 * @param importFunc - Function that imports the component
 * @param fallback - Optional custom loading component
 * @param errorFallback - Optional custom error component
 * @returns Lazy loaded component with error handling
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return (props: any) => (
    <ErrorBoundary fallback={errorFallback || <DefaultLoading />}>
      <Suspense fallback={fallback || <DefaultLoading />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Preload a lazy component
 * 
 * @param importFunc - Function that imports the component
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return () => {
    importFunc();
  };
}

export default createLazyComponent; 