/**
 * CDN Utility
 * Handles CDN URL generation and asset serving
 */

/**
 * Get CDN URL from environment
 */
export const getCdnUrl = (): string => {
  return import.meta.env.VITE_CDN_URL || '';
};

/**
 * Get Media CDN URL from environment
 */
export const getMediaCdnUrl = (): string => {
  return import.meta.env.VITE_MEDIA_CDN_URL || '';
};

/**
 * Convert a relative asset path to CDN URL
 * @param path - Relative path to the asset (e.g., '/images/logo.png')
 * @returns Full CDN URL or relative path if CDN is not configured
 */
export const getCdnAssetUrl = (path: string): string => {
  const cdnUrl = getCdnUrl();

  if (!cdnUrl) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Ensure CDN URL doesn't end with slash
  const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;

  return `${cleanCdnUrl}/${cleanPath}`;
};

/**
 * Convert a media URL to CDN URL
 * @param path - Relative or absolute media path
 * @returns Full Media CDN URL or original path if CDN is not configured
 */
export const getMediaUrl = (path: string): string => {
  const mediaCdnUrl = getMediaCdnUrl();

  if (!mediaCdnUrl || !path) {
    return path;
  }

  // If path is already a full URL (http/https), return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Ensure Media CDN URL doesn't end with slash
  const cleanMediaCdnUrl = mediaCdnUrl.endsWith('/') ? mediaCdnUrl.slice(0, -1) : mediaCdnUrl;

  return `${cleanMediaCdnUrl}/${cleanPath}`;
};

/**
 * Get optimized image URL with size and format parameters
 * @param url - Original image URL
 * @param options - Image optimization options
 * @returns Optimized image URL
 */
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export const getOptimizedImageUrl = (
  url: string,
  options: ImageOptimizationOptions = {}
): string => {
  if (!url) {
    return url;
  }

  // If URL is already optimized or is a blob/data URL, return as is
  if (url.includes('?') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  const params = new URLSearchParams();

  if (options.width) {
    params.append('w', options.width.toString());
  }

  if (options.height) {
    params.append('h', options.height.toString());
  }

  if (options.quality) {
    params.append('q', options.quality.toString());
  }

  if (options.format) {
    params.append('fm', options.format);
  }

  if (options.fit) {
    params.append('fit', options.fit);
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

/**
 * Get thumbnail URL for an image
 * @param url - Original image URL
 * @returns Thumbnail URL (200x200, webp format)
 */
export const getThumbnailUrl = (url: string): string => {
  return getOptimizedImageUrl(url, {
    width: 200,
    height: 200,
    quality: 80,
    format: 'webp',
    fit: 'cover',
  });
};

/**
 * Get standard image URL
 * @param url - Original image URL
 * @returns Standard sized image URL (800x800, webp format)
 */
export const getStandardImageUrl = (url: string): string => {
  return getOptimizedImageUrl(url, {
    width: 800,
    height: 800,
    quality: 85,
    format: 'webp',
    fit: 'cover',
  });
};

/**
 * Get HD image URL
 * @param url - Original image URL
 * @returns HD sized image URL (1920x1920, webp format)
 */
export const getHdImageUrl = (url: string): string => {
  return getOptimizedImageUrl(url, {
    width: 1920,
    height: 1920,
    quality: 90,
    format: 'webp',
    fit: 'cover',
  });
};

/**
 * Preload an image
 * @param url - Image URL to preload
 * @returns Promise that resolves when image is loaded
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Check if browser supports WebP format
 * @returns Promise that resolves to true if WebP is supported
 */
export const supportsWebP = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Get appropriate image format based on browser support
 * @returns Promise that resolves to the best supported image format
 */
export const getBestImageFormat = async (): Promise<'webp' | 'jpeg'> => {
  const webpSupported = await supportsWebP();
  return webpSupported ? 'webp' : 'jpeg';
};

/**
 * Build srcset for responsive images
 * @param url - Base image URL
 * @param widths - Array of widths for srcset
 * @returns srcset string
 */
export const buildSrcSet = (url: string, widths: number[] = [320, 640, 768, 1024, 1280, 1920]): string => {
  return widths
    .map((width) => {
      const optimizedUrl = getOptimizedImageUrl(url, { width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
};

/**
 * Get cache-busted URL by appending version or timestamp
 * @param url - Original URL
 * @param version - Optional version string
 * @returns Cache-busted URL
 */
export const getCacheBustedUrl = (url: string, version?: string): string => {
  if (!url) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  const versionParam = version || Date.now().toString();

  return `${url}${separator}v=${versionParam}`;
};

/**
 * Extract file extension from URL
 * @param url - Image URL
 * @returns File extension (e.g., 'jpg', 'png')
 */
export const getFileExtension = (url: string): string => {
  if (!url) {
    return '';
  }

  const pathname = new URL(url, window.location.origin).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
};

/**
 * Check if URL is from Azure Blob Storage
 * @param url - URL to check
 * @returns true if URL is from Azure Blob Storage
 */
export const isAzureBlobUrl = (url: string): boolean => {
  if (!url) {
    return false;
  }

  return url.includes('.blob.core.windows.net') || url.includes('.azureedge.net');
};

/**
 * Get Azure CDN URL from blob storage URL
 * @param blobUrl - Azure Blob Storage URL
 * @returns Azure CDN URL or original URL if not applicable
 */
export const getAzureCdnUrl = (blobUrl: string): string => {
  if (!blobUrl || !isAzureBlobUrl(blobUrl)) {
    return blobUrl;
  }

  const mediaCdnUrl = getMediaCdnUrl();

  if (!mediaCdnUrl) {
    return blobUrl;
  }

  try {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');

    // Remove container name from path (usually the first part after /)
    const containerName = pathParts[1];
    const blobPath = pathParts.slice(2).join('/');

    return getMediaUrl(blobPath);
  } catch (error) {
    console.error('Failed to convert blob URL to CDN URL:', error);
    return blobUrl;
  }
};

export default {
  getCdnUrl,
  getMediaCdnUrl,
  getCdnAssetUrl,
  getMediaUrl,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getStandardImageUrl,
  getHdImageUrl,
  preloadImage,
  supportsWebP,
  getBestImageFormat,
  buildSrcSet,
  getCacheBustedUrl,
  getFileExtension,
  isAzureBlobUrl,
  getAzureCdnUrl,
};
