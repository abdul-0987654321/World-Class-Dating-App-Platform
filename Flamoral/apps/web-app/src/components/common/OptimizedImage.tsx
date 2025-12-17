import React, { useState, useEffect, useRef } from 'react';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  lazy?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized Image Component with:
 * - Lazy loading (IntersectionObserver)
 * - Responsive images (srcset)
 * - Modern formats (WebP, AVIF)
 * - Loading placeholder
 * - Error fallback
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  lazy = true,
  sizes = '100vw',
  objectFit = 'cover',
  priority = false,
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(
    priority || !lazy ? src : ''
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Don't lazy load if priority or lazy is disabled
    if (priority || !lazy) {
      setImageSrc(src);
      return;
    }

    if (!imgRef.current) return;

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Start loading 50px before image enters viewport
        rootMargin: '50px',
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, lazy, priority]);

  /**
   * Generate responsive image URLs for different widths
   */
  const generateSrcSet = (format?: 'webp' | 'avif') => {
    const baseUrl = src.split('?')[0];
    const widths = [320, 640, 768, 1024, 1280, 1920];

    return widths
      .map((w) => {
        const formatParam = format ? `&fm=${format}` : '';
        return `${baseUrl}?w=${w}${formatParam} ${w}w`;
      })
      .join(', ');
  };

  /**
   * Handle image load
   */
  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  /**
   * Handle image error
   */
  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  /**
   * Placeholder SVG for lazy images
   */
  const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width || 800} ${height || 600}'%3E%3Crect width='${width || 800}' height='${height || 600}' fill='%23f0f0f0'/%3E%3C/svg%3E`;

  /**
   * Error fallback image
   */
  const errorSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width || 800} ${height || 600}'%3E%3Crect width='${width || 800}' height='${height || 600}' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial, sans-serif' font-size='20'%3EImage not available%3C/text%3E%3C/svg%3E`;

  return (
    <picture className={className}>
      {/* Modern format - AVIF (best compression, ~30% smaller than WebP) */}
      {!imageError && imageSrc && (
        <source type="image/avif" srcSet={generateSrcSet('avif')} sizes={sizes} />
      )}

      {/* Modern format - WebP (good compression, widely supported) */}
      {!imageError && imageSrc && (
        <source type="image/webp" srcSet={generateSrcSet('webp')} sizes={sizes} />
      )}

      {/* Fallback - Original format */}
      <img
        ref={imgRef}
        src={imageError ? errorSvg : imageSrc || placeholderSvg}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          ${className}
          ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          transition-opacity duration-300
        `}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          objectFit,
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
