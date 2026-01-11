import { InteractionManager, Platform } from 'react-native';

/**
 * Performance optimization utilities
 */

/**
 * Execute callback after interactions are complete
 */
export const afterInteraction = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Lazy component loader with retry logic
 */
export const lazyWithRetry = <T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries: number = 3
): Promise<{ default: T }> => {
  return new Promise((resolve, reject) => {
    const attemptImport = (retriesLeft: number) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          if (retriesLeft === 0) {
            reject(error);
            return;
          }

          console.warn(
            `Failed to load component, retrying... (${retriesLeft} attempts left)`
          );

          setTimeout(() => {
            attemptImport(retriesLeft - 1);
          }, 1000);
        });
    };

    attemptImport(retries);
  });
};

/**
 * Memory management helpers
 */
export class MemoryManager {
  private static cache = new Map<string, any>();
  private static maxCacheSize = 50;

  static set(key: string, value: any): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  static get(key: string): any {
    return this.cache.get(key);
  }

  static has(key: string): boolean {
    return this.cache.has(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static clearOldest(count: number = 10): void {
    const keys = Array.from(this.cache.keys()).slice(0, count);
    keys.forEach((key) => this.cache.delete(key));
  }

  static getSize(): number {
    return this.cache.size;
  }
}

/**
 * Image optimization helpers
 */
export const getOptimizedImageUri = (
  uri: string,
  width: number,
  height: number,
  quality: number = 80
): string => {
  // This would typically integrate with a CDN service like Cloudinary
  // For now, return the original URI
  return uri;
};

/**
 * List optimization helpers
 */
export const getItemLayout = (
  data: any,
  index: number,
  itemHeight: number
) => ({
  length: itemHeight,
  offset: itemHeight * index,
  index,
});

export const keyExtractor = (item: any, index: number): string => {
  return item.id?.toString() || index.toString();
};

/**
 * Bundle size optimization
 */
export const shouldUseNativeDriver = (): boolean => {
  return Platform.OS !== 'web';
};

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  static mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  static measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      return 0;
    }

    const duration = Date.now() - start;
    // Performance metrics are collected but not logged in production
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`Performance [${name}]: ${duration}ms`);
    }
    return duration;
  }

  static clear(name: string): void {
    this.marks.delete(name);
  }

  static clearAll(): void {
    this.marks.clear();
  }
}

/**
 * Batch updates helper
 */
export const batchUpdates = <T>(
  items: T[],
  batchSize: number,
  callback: (batch: T[]) => void,
  delay: number = 100
): void => {
  let currentIndex = 0;

  const processBatch = () => {
    const batch = items.slice(currentIndex, currentIndex + batchSize);
    if (batch.length === 0) {
      return;
    }

    callback(batch);
    currentIndex += batchSize;

    if (currentIndex < items.length) {
      setTimeout(processBatch, delay);
    }
  };

  processBatch();
};

export default {
  afterInteraction,
  debounce,
  throttle,
  lazyWithRetry,
  MemoryManager,
  getOptimizedImageUri,
  getItemLayout,
  keyExtractor,
  shouldUseNativeDriver,
  PerformanceMonitor,
  batchUpdates,
};
