/**
 * Azure Storage Optimization Configuration for Flamoral Dating Platform
 *
 * This configuration implements cost-efficient storage strategies including:
 * - Intelligent tiering (Hot, Cool, Archive)
 * - CDN integration for geographic distribution
 * - Image optimization and WebP support
 * - Automatic cleanup of temporary files
 * - Multiple size variants for responsive delivery
 */

export interface StorageTier {
  name: 'Hot' | 'Cool' | 'Archive';
  costMultiplier: number; // Relative to Hot tier
  accessLatency: string;
  bestFor: string;
}

export interface ImageVariant {
  name: string;
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
  tier: 'Hot' | 'Cool' | 'Archive';
}

export interface StoragePolicy {
  path: string;
  description: string;
  initialTier: 'Hot' | 'Cool' | 'Archive';
  coolTierAfterDays?: number;
  archiveTierAfterDays?: number;
  deleteAfterDays?: number;
  cacheControl: string;
  cdnEnabled: boolean;
}

/**
 * Azure Storage Tiers Configuration
 */
export const STORAGE_TIERS: Record<string, StorageTier> = {
  HOT: {
    name: 'Hot',
    costMultiplier: 1.0,
    accessLatency: 'Instant',
    bestFor: 'Frequently accessed content (profile photos, recent uploads)',
  },
  COOL: {
    name: 'Cool',
    costMultiplier: 0.5,
    accessLatency: 'Instant',
    bestFor: 'Infrequently accessed content (older albums, archived photos)',
  },
  ARCHIVE: {
    name: 'Archive',
    costMultiplier: 0.1,
    accessLatency: '1-15 hours',
    bestFor: 'Rarely accessed content (verification photos, original backups)',
  },
};

/**
 * Image Variants Configuration
 * Multiple sizes for responsive delivery and bandwidth optimization
 */
export const IMAGE_VARIANTS: Record<string, ImageVariant> = {
  THUMBNAIL: {
    name: 'thumbnail',
    width: 200,
    height: 200,
    quality: 80,
    format: 'webp',
    tier: 'Hot',
  },
  SMALL: {
    name: 'small',
    width: 400,
    height: 400,
    quality: 85,
    format: 'webp',
    tier: 'Hot',
  },
  MEDIUM: {
    name: 'medium',
    width: 800,
    height: 800,
    quality: 85,
    format: 'webp',
    tier: 'Hot',
  },
  LARGE: {
    name: 'large',
    width: 1200,
    height: 1200,
    quality: 90,
    format: 'webp',
    tier: 'Cool',
  },
  HD: {
    name: 'hd',
    width: 1920,
    height: 1920,
    quality: 90,
    format: 'jpeg',
    tier: 'Cool',
  },
  ORIGINAL: {
    name: 'original',
    width: 0, // Original size
    height: 0,
    quality: 100,
    format: 'jpeg',
    tier: 'Archive',
  },
};

/**
 * Storage Lifecycle Policies
 * Defines when and how to tier/delete different types of content
 */
export const STORAGE_POLICIES: Record<string, StoragePolicy> = {
  PROFILE_PHOTOS: {
    path: 'avatars/',
    description: 'User profile photos (frequently accessed)',
    initialTier: 'Hot',
    coolTierAfterDays: 30,
    cacheControl: 'public, max-age=86400, s-maxage=604800', // 1 day browser, 7 days CDN
    cdnEnabled: true,
  },
  ALBUM_PHOTOS: {
    path: 'photos/albums/',
    description: 'User photo albums (decreasing access over time)',
    initialTier: 'Hot',
    coolTierAfterDays: 30,
    archiveTierAfterDays: 90,
    cacheControl: 'public, max-age=86400, s-maxage=2592000', // 1 day browser, 30 days CDN
    cdnEnabled: true,
  },
  VERIFICATION_PHOTOS: {
    path: 'verification/',
    description: 'Identity verification photos (archive after approval)',
    initialTier: 'Hot',
    coolTierAfterDays: 7,
    archiveTierAfterDays: 14,
    cacheControl: 'private, max-age=3600', // 1 hour, no CDN cache
    cdnEnabled: false,
  },
  TEMPORARY_UPLOADS: {
    path: 'temp/',
    description: 'Temporary upload staging area',
    initialTier: 'Hot',
    deleteAfterDays: 7,
    cacheControl: 'no-store, no-cache, must-revalidate',
    cdnEnabled: false,
  },
  THUMBNAILS: {
    path: 'thumbnails/',
    description: 'Generated thumbnails (can be regenerated)',
    initialTier: 'Hot',
    coolTierAfterDays: 60,
    archiveTierAfterDays: 180,
    cacheControl: 'public, max-age=604800, s-maxage=2592000', // 7 days browser, 30 days CDN
    cdnEnabled: true,
  },
  VIDEOS: {
    path: 'videos/',
    description: 'User video content',
    initialTier: 'Hot',
    coolTierAfterDays: 45,
    archiveTierAfterDays: 120,
    cacheControl: 'public, max-age=86400, s-maxage=604800', // 1 day browser, 7 days CDN
    cdnEnabled: true,
  },
  ORIGINALS: {
    path: 'original/',
    description: 'Original high-resolution photos (for regeneration only)',
    initialTier: 'Cool',
    archiveTierAfterDays: 180,
    cacheControl: 'private, max-age=0',
    cdnEnabled: false,
  },
  INACTIVE_USERS: {
    path: 'photos/inactive/',
    description: 'Photos from inactive user accounts',
    initialTier: 'Cool',
    archiveTierAfterDays: 30,
    deleteAfterDays: 365,
    cacheControl: 'private, max-age=3600',
    cdnEnabled: false,
  },
};

/**
 * CDN Configuration
 */
export const CDN_CONFIG = {
  enabled: true,
  provider: 'Azure CDN',
  sku: 'Standard_Microsoft',
  popLocations: [
    'North America',
    'Europe',
    'Asia Pacific',
    'South America',
    'Australia',
  ],
  features: {
    compression: true,
    compressionTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    httpToHttpsRedirect: true,
    queryStringCaching: 'IgnoreQueryString',
    cacheExpirationOverride: true,
  },
  rules: [
    {
      name: 'EnforceHTTPS',
      order: 1,
      condition: 'HTTP',
      action: 'Redirect to HTTPS',
    },
    {
      name: 'CacheImages',
      order: 2,
      condition: 'File extension: jpg, jpeg, png, gif, webp',
      action: 'Cache for 7 days',
    },
    {
      name: 'CacheVideos',
      order: 3,
      condition: 'File extension: mp4, mov, webm',
      action: 'Cache for 7 days',
    },
  ],
};

/**
 * Image Compression Settings
 */
export const IMAGE_COMPRESSION = {
  jpeg: {
    quality: 85,
    progressive: true,
    optimizeCoding: true,
    mozjpeg: true,
  },
  webp: {
    quality: 85,
    alphaQuality: 85,
    method: 6, // 0-6, higher = slower but better compression
    lossless: false,
  },
  png: {
    compressionLevel: 9,
    adaptiveFiltering: true,
    palette: true,
  },
};

/**
 * Video Optimization Settings
 */
export const VIDEO_OPTIMIZATION = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxDuration: 60, // seconds
  minDuration: 3, // seconds
  variants: [
    {
      name: '1080p',
      width: 1920,
      height: 1080,
      bitrate: '5000k',
      tier: 'Hot',
    },
    {
      name: '720p',
      width: 1280,
      height: 720,
      bitrate: '2500k',
      tier: 'Hot',
    },
    {
      name: '480p',
      width: 854,
      height: 480,
      bitrate: '1000k',
      tier: 'Cool',
    },
    {
      name: '360p',
      width: 640,
      height: 360,
      bitrate: '500k',
      tier: 'Cool',
    },
  ],
  thumbnails: {
    count: 5,
    width: 320,
    height: 180,
    quality: 80,
    format: 'webp',
  },
  codec: {
    video: 'libx264',
    audio: 'aac',
    preset: 'medium', // ultrafast, fast, medium, slow
    profile: 'main',
    level: '4.0',
  },
};

/**
 * Storage Redundancy Configuration
 */
export const REDUNDANCY_CONFIG = {
  userPhotos: {
    type: 'LRS', // Locally Redundant Storage
    description: 'User photos - LRS is sufficient, lower cost',
    durability: '99.999999999%',
    costMultiplier: 1.0,
  },
  criticalData: {
    type: 'ZRS', // Zone Redundant Storage
    description: 'Critical data - ZRS for better availability',
    durability: '99.9999999999%',
    costMultiplier: 1.25,
  },
  backups: {
    type: 'GRS', // Geo-Redundant Storage
    description: 'Backups - GRS for disaster recovery',
    durability: '99.99999999999999%',
    costMultiplier: 2.0,
  },
};

/**
 * Lazy Loading Configuration
 */
export const LAZY_LOADING = {
  enabled: true,
  threshold: '200px', // Start loading when within 200px of viewport
  placeholder: 'blur', // Use blur-up technique
  rootMargin: '50px',
  sizes: {
    mobile: '(max-width: 640px) 100vw',
    tablet: '(max-width: 1024px) 50vw',
    desktop: '33vw',
  },
};

/**
 * WebP Support Detection
 */
export const WEBP_CONFIG = {
  enabled: true,
  fallback: 'jpeg',
  quality: 85,
  supportDetection: true,
  acceptHeader: 'image/webp,image/apng,image/*,*/*;q=0.8',
};

/**
 * Cleanup Configuration
 */
export const CLEANUP_CONFIG = {
  temporaryFiles: {
    enabled: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    schedule: '0 2 * * *', // Daily at 2 AM (cron format)
  },
  failedUploads: {
    enabled: true,
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    schedule: '0 3 * * *', // Daily at 3 AM
  },
  orphanedFiles: {
    enabled: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    schedule: '0 4 * * 0', // Weekly on Sunday at 4 AM
  },
};

/**
 * Cost Estimation Helpers
 */
export const COST_CALCULATOR = {
  /**
   * Calculate monthly storage cost
   */
  calculateStorageCost(sizeGB: number, tier: 'Hot' | 'Cool' | 'Archive'): number {
    const basePrice = 0.02; // $0.02 per GB for Hot tier (example pricing)
    const multiplier = STORAGE_TIERS[tier.toUpperCase()].costMultiplier;
    return sizeGB * basePrice * multiplier;
  },

  /**
   * Calculate bandwidth cost
   */
  calculateBandwidthCost(transferGB: number, useCDN: boolean): number {
    const basePrice = useCDN ? 0.05 : 0.087; // CDN is cheaper for bandwidth
    return transferGB * basePrice;
  },

  /**
   * Calculate operations cost
   */
  calculateOperationsCost(operations: number, tier: 'Hot' | 'Cool' | 'Archive'): number {
    const pricePerTenThousand = tier === 'Hot' ? 0.0004 : tier === 'Cool' ? 0.01 : 0.05;
    return (operations / 10000) * pricePerTenThousand;
  },

  /**
   * Estimate monthly cost for user
   */
  estimateUserMonthlyCost(profile: {
    photoCount: number;
    videoCount: number;
    avgPhotoSizeMB: number;
    avgVideoSizeMB: number;
    monthlyViews: number;
  }): {
    storage: number;
    bandwidth: number;
    operations: number;
    total: number;
  } {
    const photoStorageGB = (profile.photoCount * profile.avgPhotoSizeMB) / 1024;
    const videoStorageGB = (profile.videoCount * profile.avgVideoSizeMB) / 1024;

    // Assume 70% Hot, 20% Cool, 10% Archive
    const storageCost =
      this.calculateStorageCost(photoStorageGB * 0.7, 'Hot') +
      this.calculateStorageCost(photoStorageGB * 0.2, 'Cool') +
      this.calculateStorageCost(photoStorageGB * 0.1, 'Archive') +
      this.calculateStorageCost(videoStorageGB * 0.8, 'Hot') +
      this.calculateStorageCost(videoStorageGB * 0.2, 'Cool');

    const bandwidthGB = (profile.monthlyViews * profile.avgPhotoSizeMB) / 1024;
    const bandwidthCost = this.calculateBandwidthCost(bandwidthGB, true);

    const operationsCost = this.calculateOperationsCost(profile.monthlyViews, 'Hot');

    return {
      storage: storageCost,
      bandwidth: bandwidthCost,
      operations: operationsCost,
      total: storageCost + bandwidthCost + operationsCost,
    };
  },
};

/**
 * Get storage policy for a given path
 */
export function getStoragePolicy(blobPath: string): StoragePolicy | undefined {
  for (const [key, policy] of Object.entries(STORAGE_POLICIES)) {
    if (blobPath.startsWith(policy.path)) {
      return policy;
    }
  }
  return undefined;
}

/**
 * Get appropriate cache control header for path
 */
export function getCacheControl(blobPath: string): string {
  const policy = getStoragePolicy(blobPath);
  return policy?.cacheControl || 'public, max-age=3600';
}

/**
 * Check if CDN should be used for path
 */
export function shouldUseCDN(blobPath: string): boolean {
  const policy = getStoragePolicy(blobPath);
  return policy?.cdnEnabled ?? true;
}

/**
 * Get initial storage tier for path
 */
export function getInitialTier(blobPath: string): 'Hot' | 'Cool' | 'Archive' {
  const policy = getStoragePolicy(blobPath);
  return policy?.initialTier || 'Hot';
}

export default {
  STORAGE_TIERS,
  IMAGE_VARIANTS,
  STORAGE_POLICIES,
  CDN_CONFIG,
  IMAGE_COMPRESSION,
  VIDEO_OPTIMIZATION,
  REDUNDANCY_CONFIG,
  LAZY_LOADING,
  WEBP_CONFIG,
  CLEANUP_CONFIG,
  COST_CALCULATOR,
  getStoragePolicy,
  getCacheControl,
  shouldUseCDN,
  getInitialTier,
};
