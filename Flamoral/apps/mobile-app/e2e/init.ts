import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    permissions: {
      location: 'always',
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
    },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

afterAll(async () => {
  await device.terminateApp();
});

// Helper functions
export const login = async (email: string, password: string) => {
  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();
  await waitFor(element(by.id('discover-screen')))
    .toBeVisible()
    .withTimeout(5000);
};

export const logout = async () => {
  await element(by.id('profile-tab')).tap();
  await element(by.id('settings-button')).tap();
  await element(by.id('logout-button')).tap();
  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(3000);
};

export const swipeCard = async (direction: 'left' | 'right') => {
  const swipeDistance = direction === 'right' ? 'fast' : 'fast';
  const swipeDirection = direction === 'right' ? 'right' : 'left';

  await element(by.id('swipe-card')).swipe(swipeDirection, swipeDistance, 0.5, 0.5);
  await device.takeScreenshot(`swipe-${direction}`);
};

export const waitForElement = async (elementId: string, timeout = 5000) => {
  await waitFor(element(by.id(elementId)))
    .toBeVisible()
    .withTimeout(timeout);
};

export const scrollToElement = async (scrollViewId: string, elementId: string) => {
  await waitFor(element(by.id(elementId)))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(200, 'down');
};
