/**
 * Image caching utilities using react-native-fast-image
 */

import FastImage from 'react-native-fast-image';

export const preloadImages = async (urls: string[]): Promise<void> => {
  try {
    await FastImage.preload(
      urls.map((url) => ({
        uri: url,
        priority: FastImage.priority.normal,
      }))
    );
  } catch (error) {
    console.error('Failed to preload images:', error);
  }
};

export const clearImageCache = async (): Promise<void> => {
  try {
    await FastImage.clearMemoryCache();
    await FastImage.clearDiskCache();
  } catch (error) {
    console.error('Failed to clear image cache:', error);
  }
};

export const getCacheControl = (cacheTime: number = 86400): string => {
  // Default 24 hours
  return `max-age=${cacheTime}`;
};

export const getImageSource = (
  uri: string,
  priority: 'low' | 'normal' | 'high' = 'normal'
) => {
  const priorityMap = {
    low: FastImage.priority.low,
    normal: FastImage.priority.normal,
    high: FastImage.priority.high,
  };

  return {
    uri,
    priority: priorityMap[priority],
    cache: FastImage.cacheControl.immutable,
  };
};

export const ResizeMode = {
  contain: FastImage.resizeMode.contain,
  cover: FastImage.resizeMode.cover,
  stretch: FastImage.resizeMode.stretch,
  center: FastImage.resizeMode.center,
};

export default {
  preloadImages,
  clearImageCache,
  getCacheControl,
  getImageSource,
  ResizeMode,
};
