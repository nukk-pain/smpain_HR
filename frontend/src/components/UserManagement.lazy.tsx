/**
 * Lazy-loaded UserManagement components with code splitting
 * 
 * This file implements code splitting for heavy UserManagement components
 * to optimize bundle size and initial loading performance.
 */

import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Loading fallback component
const LoadingFallback: React.FC<{ height?: string | number }> = ({ height = '200px' }) => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight={height}
    role="status"
    aria-label="컴포넌트 로딩 중"
  >
    <CircularProgress size={40} />
  </Box>
);

// Lazy load heavy components
export const UserFormLazy = React.lazy(() => 
  import('./UserForm').then(module => ({ default: module.UserForm }))
);

export const UserDetailsLazy = React.lazy(() => 
  import('./UserDetails').then(module => ({ default: module.UserDetails }))
);

export const UserListLazy = React.lazy(() => 
  import('./UserList').then(module => ({ default: module.UserList }))
);

export const UserManagementContainerLazy = React.lazy(() => 
  import('./UserManagementContainer').then(module => ({ default: module.UserManagementContainer }))
);

// Wrapper components with Suspense boundaries
export const UserFormWithSuspense: React.FC<React.ComponentProps<typeof UserFormLazy>> = (props) => (
  <Suspense fallback={<LoadingFallback height="400px" />}>
    <UserFormLazy {...props} />
  </Suspense>
);

export const UserDetailsWithSuspense: React.FC<React.ComponentProps<typeof UserDetailsLazy>> = (props) => (
  <Suspense fallback={<LoadingFallback height="300px" />}>
    <UserDetailsLazy {...props} />
  </Suspense>
);

export const UserListWithSuspense: React.FC<React.ComponentProps<typeof UserListLazy>> = (props) => (
  <Suspense fallback={<LoadingFallback height="500px" />}>
    <UserListLazy {...props} />
  </Suspense>
);

export const UserManagementContainerWithSuspense: React.FC<React.ComponentProps<typeof UserManagementContainerLazy>> = (props) => (
  <Suspense fallback={<LoadingFallback height="600px" />}>
    <UserManagementContainerLazy {...props} />
  </Suspense>
);

// Error boundary for lazy components
export class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box 
          p={3} 
          textAlign="center"
          role="alert"
          aria-live="polite"
        >
          <p>컴포넌트를 로드하는 중 오류가 발생했습니다.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            다시 시도
          </button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Bundle size tracking utility
export const getBundleInfo = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      transferSize: navigation.transferSize,
      encodedBodySize: navigation.encodedBodySize,
      decodedBodySize: navigation.decodedBodySize
    };
  }
  return null;
};

// Preload utility for better UX
export const preloadUserManagementComponents = () => {
  // Preload components that are likely to be used
  const preloadPromises = [
    import('./UserForm'),
    import('./UserDetails'),
    import('./UserList'),
    import('./UserManagementContainer')
  ];

  return Promise.allSettled(preloadPromises);
};