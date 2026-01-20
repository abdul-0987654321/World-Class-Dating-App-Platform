/**
 * PerformanceMonitor - Core Web Vitals & Performance Tracking
 *
 * Metrics Targets:
 * - LCP < 2.5s (Largest Contentful Paint)
 * - FID < 100ms (First Input Delay)
 * - CLS < 0.1 (Cumulative Layout Shift)
 * - TTI < 3.5s (Time to Interactive)
 *
 * Features:
 * - Real-time performance monitoring
 * - Core Web Vitals tracking
 * - Custom performance marks
 * - Error boundary integration
 * - Performance budget alerts
 *
 * @package @flamoral/web
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte

  // Custom metrics
  tti: number | null; // Time to Interactive
  tbt: number | null; // Total Blocking Time
  fps: number; // Current frames per second
  memoryUsage: number | null; // JS heap size

  // Route-specific
  routeLoadTime: number | null;
  apiLatency: Record<string, number[]>;
}

export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  tti: number;
  bundleSize: Record<string, number>; // KB per route
}

export interface PerformanceContextValue {
  metrics: PerformanceMetrics;
  budget: PerformanceBudget;
  markStart: (name: string) => void;
  markEnd: (name: string) => number;
  trackApiCall: (endpoint: string, duration: number) => void;
  isWithinBudget: (metric: keyof PerformanceBudget) => boolean;
  getBudgetStatus: () => Record<string, 'good' | 'warning' | 'poor'>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500, // 2.5s
  fid: 100, // 100ms
  cls: 0.1,
  tti: 3500, // 3.5s
  bundleSize: {
    '/': 150, // Landing page: 150KB
    '/discovery': 200, // Discovery with card animations: 200KB
    '/messages': 180, // Messages with virtual list: 180KB
    '/profile': 120, // Profile page: 120KB
    '/settings': 100, // Settings: 100KB
  },
};

const INITIAL_METRICS: PerformanceMetrics = {
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null,
  tti: null,
  tbt: null,
  fps: 60,
  memoryUsage: null,
  routeLoadTime: null,
  apiLatency: {},
};

// ============================================================================
// PERFORMANCE CONTEXT
// ============================================================================

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
};

// ============================================================================
// WEB VITALS OBSERVER
// ============================================================================

const observeWebVitals = (callback: (metric: { name: string; value: number }) => void) => {
  // Observe LCP
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          callback({ name: 'LCP', value: lastEntry.startTime });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Observe FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          callback({ name: 'FID', value: entry.processingStart - entry.startTime });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Observe CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            callback({ name: 'CLS', value: clsValue });
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Observe FCP
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            callback({ name: 'FCP', value: entry.startTime });
          }
        });
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
        fcpObserver.disconnect();
      };
    } catch (e) {
      console.warn('PerformanceObserver not supported:', e);
    }
  }

  return () => {};
};

// ============================================================================
// FPS MONITOR
// ============================================================================

const useFpsMonitor = (callback: (fps: number) => void) => {
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFps = (currentTime: number) => {
      frameCount++;
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        callback(fps);
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFps);
    };

    animationFrameId = requestAnimationFrame(measureFps);

    return () => cancelAnimationFrame(animationFrameId);
  }, [callback]);
};

// ============================================================================
// PERFORMANCE PROVIDER
// ============================================================================

export const PerformanceProvider: React.FC<{
  children: React.ReactNode;
  budget?: Partial<PerformanceBudget>;
  onBudgetExceeded?: (metric: string, value: number, budget: number) => void;
}> = ({ children, budget: customBudget, onBudgetExceeded }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL_METRICS);
  const marksRef = useRef<Map<string, number>>(new Map());

  const budget: PerformanceBudget = {
    ...DEFAULT_BUDGET,
    ...customBudget,
  };

  // Track Core Web Vitals
  useEffect(() => {
    const unsubscribe = observeWebVitals((metric) => {
      setMetrics((prev) => {
        const key = metric.name.toLowerCase() as keyof PerformanceMetrics;
        const newMetrics = { ...prev, [key]: metric.value };

        // Check budget
        if (budget[key as keyof PerformanceBudget] !== undefined) {
          const budgetValue = budget[key as keyof PerformanceBudget] as number;
          if (metric.value > budgetValue) {
            onBudgetExceeded?.(metric.name, metric.value, budgetValue);
          }
        }

        return newMetrics;
      });
    });

    // Get TTFB from Navigation Timing
    if (typeof performance !== 'undefined') {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        setMetrics((prev) => ({
          ...prev,
          ttfb: navEntry.responseStart - navEntry.requestStart,
        }));
      }
    }

    return unsubscribe;
  }, [budget, onBudgetExceeded]);

  // Monitor FPS
  useFpsMonitor(
    useCallback((fps) => {
      setMetrics((prev) => ({ ...prev, fps }));
    }, [])
  );

  // Monitor memory usage
  useEffect(() => {
    const interval = setInterval(() => {
      if ((performance as any).memory) {
        setMetrics((prev) => ({
          ...prev,
          memoryUsage: (performance as any).memory.usedJSHeapSize / 1048576, // Convert to MB
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Mark start of a performance measurement
  const markStart = useCallback((name: string) => {
    marksRef.current.set(name, performance.now());
    performance.mark(`${name}-start`);
  }, []);

  // Mark end and return duration
  const markEnd = useCallback((name: string): number => {
    const start = marksRef.current.get(name);
    if (!start) {
      console.warn(`No start mark found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - start;
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    marksRef.current.delete(name);

    return duration;
  }, []);

  // Track API call latency
  const trackApiCall = useCallback((endpoint: string, duration: number) => {
    setMetrics((prev) => ({
      ...prev,
      apiLatency: {
        ...prev.apiLatency,
        [endpoint]: [...(prev.apiLatency[endpoint] || []).slice(-9), duration],
      },
    }));
  }, []);

  // Check if metric is within budget
  const isWithinBudget = useCallback(
    (metric: keyof PerformanceBudget): boolean => {
      const value = metrics[metric as keyof PerformanceMetrics];
      const budgetValue = budget[metric];

      if (value === null || budgetValue === undefined) {
        return true;
      }

      return (value as number) <= (budgetValue as number);
    },
    [metrics, budget]
  );

  // Get status for all metrics
  const getBudgetStatus = useCallback((): Record<string, 'good' | 'warning' | 'poor'> => {
    const getStatus = (value: number | null, budgetValue: number): 'good' | 'warning' | 'poor' => {
      if (value === null) return 'good';
      if (value <= budgetValue) return 'good';
      if (value <= budgetValue * 1.5) return 'warning';
      return 'poor';
    };

    return {
      lcp: getStatus(metrics.lcp, budget.lcp),
      fid: getStatus(metrics.fid, budget.fid),
      cls: getStatus(metrics.cls, budget.cls),
      tti: getStatus(metrics.tti, budget.tti),
    };
  }, [metrics, budget]);

  const value: PerformanceContextValue = {
    metrics,
    budget,
    markStart,
    markEnd,
    trackApiCall,
    isWithinBudget,
    getBudgetStatus,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

// ============================================================================
// PERFORMANCE DEBUG OVERLAY (Development Only)
// ============================================================================

export const PerformanceOverlay = memo(() => {
  const { metrics, getBudgetStatus } = usePerformance();
  const status = getBudgetStatus();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getStatusColor = (s: 'good' | 'warning' | 'poor') => {
    switch (s) {
      case 'good':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900/95 text-white p-4 rounded-lg shadow-xl text-xs font-mono backdrop-blur-sm max-w-xs">
      <div className="text-sm font-bold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Performance Monitor
      </div>

      <div className="space-y-1">
        {/* Core Web Vitals */}
        <div className="flex justify-between items-center">
          <span>LCP:</span>
          <span className="flex items-center gap-2">
            {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : '--'}
            <span className={`w-2 h-2 rounded-full ${getStatusColor(status.lcp)}`} />
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>FID:</span>
          <span className="flex items-center gap-2">
            {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : '--'}
            <span className={`w-2 h-2 rounded-full ${getStatusColor(status.fid)}`} />
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>CLS:</span>
          <span className="flex items-center gap-2">
            {metrics.cls !== null ? metrics.cls.toFixed(3) : '--'}
            <span className={`w-2 h-2 rounded-full ${getStatusColor(status.cls)}`} />
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>FCP:</span>
          <span>{metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : '--'}</span>
        </div>

        <div className="flex justify-between items-center">
          <span>TTFB:</span>
          <span>{metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : '--'}</span>
        </div>

        <div className="border-t border-gray-700 mt-2 pt-2">
          <div className="flex justify-between items-center">
            <span>FPS:</span>
            <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 55 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.fps}
            </span>
          </div>

          {metrics.memoryUsage && (
            <div className="flex justify-between items-center">
              <span>Memory:</span>
              <span>{metrics.memoryUsage.toFixed(1)} MB</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PerformanceOverlay.displayName = 'PerformanceOverlay';

// ============================================================================
// PERFORMANCE HOOKS
// ============================================================================

/**
 * Hook to measure component render time
 */
export const useRenderTime = (componentName: string) => {
  const { markStart, markEnd } = usePerformance();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      markStart(`${componentName}-render`);
      mountedRef.current = true;
    }

    return () => {
      const duration = markEnd(`${componentName}-render`);
      if (process.env.NODE_ENV === 'development' && duration > 16) {
        console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
      }
    };
  }, [componentName, markStart, markEnd]);
};

/**
 * Hook to track route transitions
 */
export const useRoutePerformance = (routeName: string) => {
  const { markStart, markEnd } = usePerformance();

  useEffect(() => {
    markStart(`route-${routeName}`);

    return () => {
      const duration = markEnd(`route-${routeName}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Route] ${routeName} loaded in ${duration.toFixed(2)}ms`);
      }
    };
  }, [routeName, markStart, markEnd]);
};

/**
 * Hook to track API call performance
 */
export const useApiPerformance = () => {
  const { trackApiCall } = usePerformance();

  const trackRequest = useCallback(
    async <T,>(endpoint: string, request: Promise<T>): Promise<T> => {
      const start = performance.now();
      try {
        const result = await request;
        trackApiCall(endpoint, performance.now() - start);
        return result;
      } catch (error) {
        trackApiCall(endpoint, performance.now() - start);
        throw error;
      }
    },
    [trackApiCall]
  );

  return { trackRequest };
};

export default PerformanceProvider;
