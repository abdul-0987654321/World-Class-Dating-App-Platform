/**
 * ImageOptimization - Progressive Image Loading with Blur-Up Placeholders
 *
 * Features:
 * - LQIP (Low Quality Image Placeholder) blur-up effect
 * - Intersection Observer for lazy loading
 * - WebP/AVIF format detection with fallbacks
 * - Responsive srcset generation
 * - Priority loading for above-the-fold images
 *
 * @package @flamoral/web
 */

import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string; // Low-res placeholder URL or base64
  priority?: boolean;
  quality?: number;
  sizes?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: number;
}

export interface ImageLoaderConfig {
  src: string;
  width?: number;
  quality?: number;
}

// ============================================================================
// IMAGE FORMAT DETECTION
// ============================================================================

const formatSupport = {
  avif: false,
  webp: false,
};

// Detect format support on module load
if (typeof window !== 'undefined') {
  const checkAvif = new Image();
  checkAvif.onload = () => { formatSupport.avif = true; };
  checkAvif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIDUhLiMRyAAACUJZQADBBBkYBPHRQ'; // Minimal AVIF test

  const checkWebp = new Image();
  checkWebp.onload = () => { formatSupport.webp = true; };
  checkWebp.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
}

// ============================================================================
// IMAGE LOADER UTILITIES
// ============================================================================

/**
 * Default image loader - can be replaced with CDN-specific loader
 */
export const defaultImageLoader = ({ src, width, quality = 75 }: ImageLoaderConfig): string => {
  // If using Cloudinary, Imgix, or similar CDN, transform URL here
  // Example for Cloudinary:
  // return `https://res.cloudinary.com/flamoral/image/upload/w_${width},q_${quality}/${src}`;

  // For development/local images, return as-is
  if (src.startsWith('http') || src.startsWith('data:')) {
    return src;
  }

  // Basic width-based loading (assumes server supports width parameter)
  const url = new URL(src, window.location.origin);
  if (width) url.searchParams.set('w', width.toString());
  if (quality) url.searchParams.set('q', quality.toString());

  return url.toString();
};

/**
 * Generate srcset for responsive images
 */
export const generateSrcSet = (
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536],
  loader: typeof defaultImageLoader = defaultImageLoader
): string => {
  return widths
    .map((w) => `${loader({ src, width: w })} ${w}w`)
    .join(', ');
};

/**
 * Generate blur data URL from image
 */
export const generateBlurDataURL = async (src: string, size = 10): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = (img.height / img.width) * size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.1));
    };
    img.onerror = reject;
    img.src = src;
  });
};

// ============================================================================
// INTERSECTION OBSERVER HOOK
// ============================================================================

const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, options]);

  return isIntersecting;
};

// ============================================================================
// OPTIMIZED IMAGE COMPONENT
// ============================================================================

export const OptimizedImage = memo<ImageProps>(({
  src,
  alt,
  width,
  height,
  placeholder,
  priority = false,
  quality = 75,
  sizes,
  className = '',
  onLoad,
  onError,
  objectFit = 'cover',
  aspectRatio,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const isIntersecting = useIntersectionObserver(containerRef, {
    rootMargin: '200px',
  });

  const shouldLoad = priority || isIntersecting;

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  // Generate srcset
  const srcSet = useMemo(
    () => shouldLoad ? generateSrcSet(src) : undefined,
    [src, shouldLoad]
  );

  // Compute aspect ratio style
  const aspectRatioStyle = useMemo(() => {
    if (aspectRatio) {
      return { aspectRatio: aspectRatio.toString() };
    }
    if (width && height) {
      return { aspectRatio: `${width}/${height}` };
    }
    return {};
  }, [aspectRatio, width, height]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        ...aspectRatioStyle,
      }}
    >
      {/* Placeholder */}
      {placeholder && !loaded && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${placeholder})`,
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Gradient placeholder fallback */}
      {!placeholder && !loaded && !error && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"
        />
      )}

      {/* Main image */}
      {shouldLoad && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes || '100vw'}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            absolute inset-0 w-full h-full
            object-${objectFit}
            transition-opacity duration-500
            ${loaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============================================================================
// PROFILE IMAGE WITH BLUR-UP
// ============================================================================

export interface ProfileImageProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  priority?: boolean;
  className?: string;
  verified?: boolean;
}

const profileSizes = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

export const ProfileImage = memo<ProfileImageProps>(({
  src,
  alt,
  size = 'md',
  priority = false,
  className = '',
  verified = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const isIntersecting = useIntersectionObserver(imgRef as any, {
    rootMargin: '100px',
  });

  const shouldLoad = priority || isIntersecting;

  return (
    <div className={`relative ${profileSizes[size]} ${className}`}>
      {/* Placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}

      {/* Image */}
      {shouldLoad && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`
            absolute inset-0 w-full h-full rounded-full object-cover
            transition-opacity duration-300
            ${loaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-lg">?</span>
        </div>
      )}

      {/* Verified badge */}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        </div>
      )}
    </div>
  );
});

ProfileImage.displayName = 'ProfileImage';

// ============================================================================
// IMAGE GALLERY WITH LAZY LOADING
// ============================================================================

export interface GalleryImageProps {
  images: Array<{ url: string; alt?: string }>;
  onImageClick?: (index: number) => void;
  columns?: 2 | 3 | 4;
  gap?: number;
}

export const ImageGallery = memo<GalleryImageProps>(({
  images,
  onImageClick,
  columns = 3,
  gap = 4,
}) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-${gap}`}>
      {images.map((image, index) => (
        <div
          key={image.url}
          className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
          onClick={() => onImageClick?.(index)}
        >
          <OptimizedImage
            src={image.url}
            alt={image.alt || `Image ${index + 1}`}
            objectFit="cover"
            className="w-full h-full"
            priority={index < 4} // Priority for first 4 images
          />
        </div>
      ))}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// ============================================================================
// PRELOAD CRITICAL IMAGES
// ============================================================================

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

export const preloadImages = async (srcs: string[]): Promise<void> => {
  await Promise.allSettled(srcs.map(preloadImage));
};

// ============================================================================
// IMAGE PRELOAD LINK GENERATOR
// ============================================================================

export const ImagePreloadLinks = memo<{ images: string[] }>(({ images }) => {
  return (
    <>
      {images.slice(0, 3).map((src) => (
        <link
          key={src}
          rel="preload"
          as="image"
          href={src}
          fetchPriority="high"
        />
      ))}
    </>
  );
});

ImagePreloadLinks.displayName = 'ImagePreloadLinks';

export default OptimizedImage;
