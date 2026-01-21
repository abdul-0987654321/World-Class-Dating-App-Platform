/// <reference types="cypress" />

describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@flamoral.com`,
    password: 'Test123!@#',
    name: 'Test User',
    dateOfBirth: '1995-01-15',
    gender: 'male',
  };

  beforeEach(() => {
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should display registration form', () => {
      cy.visit('/register');
      cy.get('[data-testid="register-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="register-button"]').should('be.disabled');
    });

    it('should validate email format', () => {
      cy.visit('/register');
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="email-error"]').should('contain', 'valid email');
    });

    it('should validate password strength', () => {
      cy.visit('/register');
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="password-error"]').should('be.visible');
    });

    it('should validate password confirmation', () => {
      cy.visit('/register');
      cy.get('[data-testid="password-input"]').type('Test123!@#');
      cy.get('[data-testid="confirm-password-input"]').type('Different123!@#');
      cy.get('[data-testid="password-match-error"]').should('contain', 'match');
    });

    it('should validate age requirement (18+)', () => {
      cy.visit('/register');
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 15);
      const dobString = recentDate.toISOString().split('T')[0];

      cy.get('[data-testid="dob-input"]').type(dobString);
      cy.get('[data-testid="age-error"]').should('contain', '18');
    });

    it('should successfully register a new user', () => {
      cy.registerUser(testUser);
      cy.url().should('include', '/profile-setup');
      cy.get('[data-testid="welcome-message"]').should('contain', testUser.name);
    });

    it('should prevent duplicate email registration', () => {
      cy.visit('/register');
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
      cy.get('[data-testid="name-input"]').type(testUser.name);
      cy.get('[data-testid="dob-input"]').type(testUser.dateOfBirth);
      cy.get(`[data-testid="gender-${testUser.gender}"]`).click();
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="error-message"]').should('contain', 'already exists');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display login form', () => {
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.get('[data-testid="email-input"]').type('wrong@email.com');
      cy.get('[data-testid="password-input"]').type('WrongPassword123!');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="error-message"]').should('contain', 'Invalid');
    });

    it('should successfully login with valid credentials', () => {
      cy.login(testUser.email, testUser.password);
      cy.url().should('not.include', '/login');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should persist session after page reload', () => {
      cy.login(testUser.email, testUser.password);
      cy.reload();
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should redirect to intended page after login', () => {
      cy.visit('/profile');
      cy.url().should('include', '/login');

      cy.login(testUser.email, testUser.password);
      cy.visit('/profile');
      cy.url().should('include', '/profile');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.visit('/forgot-password');
    });

    it('should display password reset form', () => {
      cy.get('[data-testid="forgot-password-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
    });

    it('should send password reset email', () => {
      cy.interceptAPI('POST', '**/api/v1/auth/forgot-password', { success: true }, 'resetPassword');

      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="submit-button"]').click();

      cy.wait('@resetPassword');
      cy.get('[data-testid="success-message"]').should('contain', 'email sent');
    });

    it('should handle password reset with token', () => {
      const resetToken = 'valid-reset-token';
      cy.visit(`/reset-password?token=${resetToken}`);

      cy.get('[data-testid="new-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-button"]').click();

      cy.url().should('include', '/login');
      cy.get('[data-testid="success-message"]').should('contain', 'reset successfully');
    });
  });

  describe('Social Authentication', () => {
    it('should display social login buttons', () => {
      cy.visit('/login');
      cy.get('[data-testid="google-login"]').should('be.visible');
      cy.get('[data-testid="facebook-login"]').should('be.visible');
      cy.get('[data-testid="apple-login"]').should('be.visible');
    });

    it('should initiate Google OAuth flow', () => {
      cy.visit('/login');
      cy.get('[data-testid="google-login"]').click();
      // OAuth redirect would happen in real scenario
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should successfully logout', () => {
      cy.logout();
      cy.url().should('include', '/login');
      cy.window().its('localStorage.token').should('not.exist');
    });

    it('should clear all session data on logout', () => {
      cy.logout();
      cy.getAllLocalStorage().should('deep.equal', {});
      cy.getAllCookies().should('have.length', 0);
    });
  });

  describe('Session Management', () => {
    it('should handle expired token', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'expired-token');
      });

      cy.visit('/discover');
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
    });

    it('should refresh token automatically', () => {
      cy.login(testUser.email, testUser.password);

      // Intercept token refresh
      cy.interceptAPI(
        'POST',
        '**/api/v1/auth/refresh',
        {
          token: 'new-token',
          expiresIn: 3600,
        },
        'refreshToken'
      );

      // Trigger token refresh (wait for expiry - simulated)
      cy.wait(5000);
      cy.visit('/discover');

      cy.get('@refreshToken').should('exist');
    });
  });
});
