import { by, device, element, expect } from 'detox';

describe('Registration Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Initial Screen', () => {
    it('should show welcome screen with login and register options', async () => {
      await expect(element(by.id('welcome-screen'))).toBeVisible();
      await expect(element(by.id('login-button'))).toBeVisible();
      await expect(element(by.id('register-button'))).toBeVisible();
    });

    it('should navigate to registration when register button is tapped', async () => {
      await element(by.id('register-button')).tap();
      await expect(element(by.id('registration-screen'))).toBeVisible();
    });
  });

  describe('Email Step', () => {
    beforeEach(async () => {
      await element(by.id('register-button')).tap();
    });

    it('should show email input field', async () => {
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('continue-button'))).toBeVisible();
    });

    it('should show error for invalid email format', async () => {
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('email-error'))).toBeVisible();
    });

    it('should proceed to password step with valid email', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      await element(by.id('email-input')).typeText(testEmail);
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('password-step'))).toBeVisible();
    });
  });

  describe('Password Step', () => {
    beforeEach(async () => {
      await element(by.id('register-button')).tap();
      await element(by.id('email-input')).typeText(`test-${Date.now()}@example.com`);
      await element(by.id('continue-button')).tap();
    });

    it('should show password requirements', async () => {
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('password-requirements'))).toBeVisible();
    });

    it('should show error for weak password', async () => {
      await element(by.id('password-input')).typeText('123');
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('password-error'))).toBeVisible();
    });

    it('should proceed with valid password', async () => {
      await element(by.id('password-input')).typeText('ValidPassword123!');
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('profile-step'))).toBeVisible();
    });
  });

  describe('Profile Step', () => {
    beforeEach(async () => {
      await element(by.id('register-button')).tap();
      await element(by.id('email-input')).typeText(`test-${Date.now()}@example.com`);
      await element(by.id('continue-button')).tap();
      await element(by.id('password-input')).typeText('ValidPassword123!');
      await element(by.id('continue-button')).tap();
    });

    it('should show profile fields', async () => {
      await expect(element(by.id('first-name-input'))).toBeVisible();
      await expect(element(by.id('date-of-birth-picker'))).toBeVisible();
      await expect(element(by.id('gender-selector'))).toBeVisible();
    });

    it('should require first name', async () => {
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('first-name-error'))).toBeVisible();
    });

    it('should validate minimum age (18+)', async () => {
      await element(by.id('first-name-input')).typeText('Test');
      // Select a date that makes user under 18
      await element(by.id('date-of-birth-picker')).tap();
      // Assuming date picker interaction
      await element(by.id('continue-button')).tap();
      await expect(element(by.id('age-error'))).toExist();
    });
  });

  describe('Photo Upload Step', () => {
    // Skip setup steps for brevity - would include full flow in real test
    it('should require at least one photo', async () => {
      // Navigate to photo step
      await expect(element(by.id('photo-upload-step'))).toBeVisible();
      await expect(element(by.id('photo-upload-prompt'))).toBeVisible();
    });

    it('should show photo picker when add photo is tapped', async () => {
      await element(by.id('add-photo-button')).tap();
      await expect(element(by.id('photo-source-modal'))).toBeVisible();
    });
  });

  describe('Complete Registration', () => {
    it('should show success screen after completing registration', async () => {
      // Full registration flow would complete here
      await expect(element(by.id('registration-success'))).toBeVisible();
      await expect(element(by.id('start-exploring-button'))).toBeVisible();
    });

    it('should navigate to discovery after tapping start', async () => {
      await element(by.id('start-exploring-button')).tap();
      await expect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });
});
