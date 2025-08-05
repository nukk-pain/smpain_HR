/**
 * Performance Optimization Utilities
 * 
 * Collection of utilities to optimize React component performance,
 * prevent unnecessary re-renders, and improve user experience.
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { debounce } from 'lodash-es';

/**
 * Deep comparison for React.memo and useMemo dependencies
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Custom hook for stable callback references
 * Prevents child components from re-rendering due to callback reference changes
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T => {
  const callbackRef = useRef<T>(callback);
  const stableCallback = useRef<T>();

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  // Create stable callback reference
  if (!stableCallback.current) {
    stableCallback.current = ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T;
  }

  return stableCallback.current;
};

/**
 * Debounced callback hook with stable reference
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const callbackRef = useRef<T>(callback);
  const debouncedCallback = useRef<T>();

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  // Create debounced callback
  const debouncedFn = useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }, delay);
  }, [delay]);

  if (!debouncedCallback.current) {
    debouncedCallback.current = debouncedFn as T;
  }

  return debouncedCallback.current;
};

/**
 * Memoized selector hook for complex state selection
 */
export const useMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  state: T,
  equalityFn: (a: R, b: R) => boolean = Object.is
): R => {
  const lastState = useRef<T>();
  const lastResult = useRef<R>();

  const result = useMemo(() => {
    if (lastState.current !== state) {
      const newResult = selector(state);
      if (!lastResult.current || !equalityFn(lastResult.current, newResult)) {
        lastResult.current = newResult;
      }
      lastState.current = state;
    }
    return lastResult.current!;
  }, [state, selector, equalityFn]);

  return result;
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);
  const totalRenderTime = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    renderCount.current++;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      lastRenderTime.current = renderTime;
      totalRenderTime.current += renderTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderCount: renderCount.current,
          lastRenderTime: renderTime.toFixed(2) + 'ms',
          avgRenderTime: (totalRenderTime.current / renderCount.current).toFixed(2) + 'ms'
        });
      }
    };
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
    avgRenderTime: totalRenderTime.current / renderCount.current
  };
};

/**
 * Virtualization helper for large lists
 */
export const useVirtualization = (
  items: any[],
  itemHeight: number,
  containerHeight: number,
  buffer: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  }, [scrollTop, itemHeight, buffer]);

  const visibleEnd = useMemo(() => {
    return Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );
  }, [scrollTop, containerHeight, itemHeight, buffer, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleStart, visibleEnd).map((item, index) => ({
      ...item,
      index: visibleStart + index
    }));
  }, [items, visibleStart, visibleEnd]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

/**
 * Batch state updates to prevent multiple re-renders
 */
export const useBatchedUpdates = () => {
  return useCallback((batchFn: () => void) => {
    // In React 18+, updates are automatically batched
    // For older versions, we can use unstable_batchedUpdates
    batchFn();
  }, []);
};

/**
 * Memory-efficient event handler cache
 */
const eventHandlerCache = new WeakMap();

export const getCachedEventHandler = <T extends (...args: any[]) => any>(
  key: object,
  factory: () => T
): T => {
  if (!eventHandlerCache.has(key)) {
    eventHandlerCache.set(key, factory());
  }
  return eventHandlerCache.get(key);
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options.threshold, options.rootMargin, hasIntersected]);

  return { isIntersecting, hasIntersected };
};

/**
 * Optimized array comparison for useMemo dependencies
 */
export const useArrayComparison = <T>(array: T[]): T[] => {
  const previousArray = useRef<T[]>(array);

  return useMemo(() => {
    if (
      array.length !== previousArray.current.length ||
      array.some((item, index) => item !== previousArray.current[index])
    ) {
      previousArray.current = array;
      return array;
    }
    return previousArray.current;
  }, [array]);
};

/**
 * Bundle size monitoring (development only)
 */
export const trackBundleSize = (componentName: string) => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`[Bundle Size] ${componentName}:`, {
      usedJSHeapSize: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      totalJSHeapSize: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB'
    });
  }
};

// Import React's lazy and Suspense for code splitting
export { lazy, Suspense } from 'react';