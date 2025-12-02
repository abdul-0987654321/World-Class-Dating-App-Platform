/**
 * Navigation Service
 * Provides navigation utilities for deep linking and programmatic navigation
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

export function goBack() {
  if (navigationRef.isReady()) {
    navigationRef.goBack();
  }
}

export function resetRoot(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name, params }],
    });
  }
}

export default {
  navigationRef,
  navigate,
  goBack,
  resetRoot,
};
