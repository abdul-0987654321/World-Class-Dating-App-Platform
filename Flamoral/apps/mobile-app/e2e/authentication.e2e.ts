import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { login, logout } from './init';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always', notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('User Registration', () => {
    it('should display welcome screen on first launch', async () => {
      await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
      await detoxExpect(element(by.id('get-started-button'))).toBeVisible();
    });

    it('should navigate to registration screen', async () => {
      await element(by.id('get-started-button')).tap();
      await waitFor(element(by.id('registration-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should validate email format', async () => {
      await element(by.id('get-started-button')).tap();
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('next-button')).tap();

      await detoxExpect(element(by.id('email-error'))).toBeVisible();
    });

    it('should validate password strength', async () => {
      await element(by.id('get-started-button')).tap();
      await element(by.id('email-input')).typeText('test@flamoral.com');
      await element(by.id('next-button')).tap();

      await element(by.id('password-input')).typeText('weak');
      await element(by.id('next-button')).tap();

      await detoxExpect(element(by.id('password-error'))).toBeVisible();
    });

    it('should complete basic registration', async () => {
      const timestamp = Date.now();
      const email = `test-${timestamp}@flamoral.com`;

      await element(by.id('get-started-button')).tap();

      // Email step
      await element(by.id('email-input')).typeText(email);
      await element(by.id('next-button')).tap();

      // Password step
      await waitFor(element(by.id('password-input'))).toBeVisible();
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('next-button')).tap();

      // Name step
      await waitFor(element(by.id('name-input'))).toBeVisible();
      await element(by.id('name-input')).typeText('Test User');
      await element(by.id('next-button')).tap();

      // Date of birth step
      await waitFor(element(by.id('dob-picker'))).toBeVisible();
      await element(by.id('dob-picker')).tap();
      await element(by.label('1995')).tap();
      await element(by.label('January')).tap();
      await element(by.label('15')).tap();
      await element(by.id('confirm-dob')).tap();
      await element(by.id('next-button')).tap();

      // Gender step
      await waitFor(element(by.id('gender-selector'))).toBeVisible();
      await element(by.id('gender-male')).tap();
      await element(by.id('next-button')).tap();

      // Should navigate to profile setup
      await waitFor(element(by.id('profile-setup-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should validate age requirement (18+)', async () => {
      await element(by.id('get-started-button')).tap();
      await element(by.id('email-input')).typeText('underage@test.com');
      await element(by.id('next-button')).tap();

      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('next-button')).tap();

      await element(by.id('name-input')).typeText('Young User');
      await element(by.id('next-button')).tap();

      // Select recent date (under 18)
      await element(by.id('dob-picker')).tap();
      const currentYear = new Date().getFullYear();
      await element(by.label((currentYear - 15).toString())).tap();
      await element(by.label('January')).tap();
      await element(by.label('1')).tap();
      await element(by.id('confirm-dob')).tap();
      await element(by.id('next-button')).tap();

      await detoxExpect(element(by.id('age-error'))).toBeVisible();
    });
  });

  describe('User Login', () => {
    const testUser = {
      email: 'login-test@flamoral.com',
      password: 'TestPass123!',
    };

    it('should display login screen', async () => {
      await element(by.id('login-link')).tap();
      await waitFor(element(by.id('login-screen'))).toBeVisible();
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible();
    });

    it('should show error for invalid credentials', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('email-input')).typeText('wrong@email.com');
      await element(by.id('password-input')).typeText('WrongPassword123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('login-error')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should successfully login with valid credentials', async () => {
      await element(by.id('login-link')).tap();
      await login(testUser.email, testUser.password);

      await detoxExpect(element(by.id('discover-screen'))).toBeVisible();
    });

    it('should toggle password visibility', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('password-input')).typeText('TestPassword');

      // Password should be hidden by default
      await detoxExpect(element(by.id('password-input'))).toHaveText('••••••••••••');

      // Toggle visibility
      await element(by.id('toggle-password-visibility')).tap();
      await detoxExpect(element(by.id('password-input'))).toHaveText('TestPassword');
    });
  });

  describe('Password Reset', () => {
    it('should navigate to forgot password screen', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('forgot-password-link')).tap();

      await detoxExpect(element(by.id('forgot-password-screen'))).toBeVisible();
    });

    it('should send password reset email', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('forgot-password-link')).tap();

      await element(by.id('email-input')).typeText('reset@flamoral.com');
      await element(by.id('send-reset-button')).tap();

      await waitFor(element(by.id('reset-email-sent')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Social Login', () => {
    it('should display social login options', async () => {
      await element(by.id('login-link')).tap();

      await detoxExpect(element(by.id('google-login-button'))).toBeVisible();
      await detoxExpect(element(by.id('facebook-login-button'))).toBeVisible();
      await detoxExpect(element(by.id('apple-login-button'))).toBeVisible();
    });

    it('should initiate Google login', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('google-login-button')).tap();

      // OAuth flow would happen here in real scenario
      // Just verify the button works
      await device.takeScreenshot('google-login-initiated');
    });

    it('should initiate Apple login (iOS only)', async () => {
      if (device.getPlatform() === 'ios') {
        await element(by.id('login-link')).tap();
        await element(by.id('apple-login-button')).tap();

        await device.takeScreenshot('apple-login-initiated');
      }
    });
  });

  describe('Biometric Authentication', () => {
    it('should offer biometric login for returning users', async () => {
      // First login with credentials
      await element(by.id('login-link')).tap();
      await login('biometric@flamoral.com', 'TestPass123!');

      // Logout
      await logout();

      // Should now see biometric option
      await detoxExpect(element(by.id('biometric-login-button'))).toBeVisible();
    });

    it('should authenticate with Face ID (iOS)', async () => {
      if (device.getPlatform() === 'ios') {
        await element(by.id('biometric-login-button')).tap();

        // Simulate successful biometric auth
        await device.setBiometricEnrollment(true);
        await device.matchFace();

        await waitFor(element(by.id('discover-screen')))
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should authenticate with fingerprint (Android)', async () => {
      if (device.getPlatform() === 'android') {
        await element(by.id('biometric-login-button')).tap();

        // Simulate successful fingerprint auth
        await device.setBiometricEnrollment(true);
        await device.matchFinger();

        await waitFor(element(by.id('discover-screen')))
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should fallback to password on biometric failure', async () => {
      await element(by.id('biometric-login-button')).tap();

      // Simulate failed biometric auth
      await device.setBiometricEnrollment(true);
      await device.unmatchFace();

      await detoxExpect(element(by.id('use-password-button'))).toBeVisible();
    });
  });

  describe('Phone Number Verification', () => {
    it('should send verification code', async () => {
      await element(by.id('get-started-button')).tap();

      // Navigate through registration to phone verification
      await element(by.id('email-input')).typeText('phone@test.com');
      await element(by.id('next-button')).tap();

      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('next-button')).tap();

      await element(by.id('phone-input')).typeText('+12025551234');
      await element(by.id('send-code-button')).tap();

      await waitFor(element(by.id('verification-code-input')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should verify phone number with code', async () => {
      await waitFor(element(by.id('verification-code-input'))).toBeVisible();

      await element(by.id('verification-code-input')).typeText('123456');
      await element(by.id('verify-button')).tap();

      await waitFor(element(by.id('phone-verified')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should resend verification code', async () => {
      await waitFor(element(by.id('verification-code-input'))).toBeVisible();

      await element(by.id('resend-code-button')).tap();

      await waitFor(element(by.id('code-resent-message')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Session Management', () => {
    it('should maintain session after app restart', async () => {
      await element(by.id('login-link')).tap();
      await login('session@flamoral.com', 'TestPass123!');

      // Restart app
      await device.terminateApp();
      await device.launchApp({ newInstance: false });

      // Should still be logged in
      await detoxExpect(element(by.id('discover-screen'))).toBeVisible();
    });

    it('should logout successfully', async () => {
      await element(by.id('login-link')).tap();
      await login('logout@flamoral.com', 'TestPass123!');

      await logout();

      await detoxExpect(element(by.id('login-screen'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Disable network
      await device.setStatusBar({ wifiConnected: false, dataConnected: false });

      await element(by.id('login-link')).tap();
      await element(by.id('email-input')).typeText('test@flamoral.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('network-error')))
        .toBeVisible()
        .withTimeout(5000);

      // Re-enable network
      await device.setStatusBar({ wifiConnected: true, dataConnected: true });
    });

    it('should retry failed login', async () => {
      await element(by.id('login-link')).tap();
      await element(by.id('email-input')).typeText('retry@flamoral.com');
      await element(by.id('password-input')).typeText('WrongPass123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('login-error'))).toBeVisible();

      // Clear password and retry
      await element(by.id('password-input')).clearText();
      await element(by.id('password-input')).typeText('CorrectPass123!');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('discover-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});
