/// <reference types="cypress" />

/**
 * Custom Cypress Commands for Flamoral Dating Platform
 */

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('not.include', '/login');
    cy.window().its('localStorage.token').should('exist');
  });
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Register user command
Cypress.Commands.add('registerUser', (userData) => {
  cy.visit('/register');

  cy.get('[data-testid="email-input"]').type(userData.email);
  cy.get('[data-testid="password-input"]').type(userData.password);
  cy.get('[data-testid="confirm-password-input"]').type(userData.password);
  cy.get('[data-testid="name-input"]').type(userData.name);
  cy.get('[data-testid="dob-input"]').type(userData.dateOfBirth);
  cy.get(`[data-testid="gender-${userData.gender}"]`).click();
  cy.get('[data-testid="terms-checkbox"]').check();
  cy.get('[data-testid="register-button"]').click();

  cy.url().should('include', '/profile-setup');
});

// Setup profile command
Cypress.Commands.add('setupProfile', (profileData) => {
  if (profileData.bio) {
    cy.get('[data-testid="bio-textarea"]').type(profileData.bio);
  }

  if (profileData.interests && profileData.interests.length > 0) {
    profileData.interests.forEach((interest) => {
      cy.get(`[data-testid="interest-${interest}"]`).click();
    });
  }

  if (profileData.photos && profileData.photos.length > 0) {
    profileData.photos.forEach((photo, index) => {
      cy.get(`[data-testid="photo-upload-${index}"]`).selectFile(photo, { force: true });
    });
  }

  cy.get('[data-testid="save-profile-button"]').click();
});

// Swipe card command
Cypress.Commands.add('swipeCard', (direction) => {
  const swipeDistance = direction === 'right' ? 300 : -300;

  cy.get('[data-testid="swipe-card"]')
    .first()
    .trigger('mousedown', { which: 1 })
    .trigger('mousemove', { clientX: swipeDistance })
    .trigger('mouseup', { force: true });

  cy.wait(500); // Wait for animation
});

// Send message command
Cypress.Commands.add('sendMessage', (conversationId, message) => {
  cy.get(`[data-testid="conversation-${conversationId}"]`).click();
  cy.get('[data-testid="message-input"]').type(message);
  cy.get('[data-testid="send-button"]').click();

  cy.get('[data-testid="message-list"]').should('contain', message);
});

// Wait for WebSocket connection
Cypress.Commands.add('waitForWebSocket', () => {
  cy.window().its('WebSocket').should('exist');
  cy.wait(1000); // Give WebSocket time to establish connection
});

// Mock geolocation
Cypress.Commands.add('mockGeolocation', (latitude, longitude) => {
  cy.window().then((win) => {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
      return cb({
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
  });
});

// Intercept API calls
Cypress.Commands.add('interceptAPI', (method, url, response, alias) => {
  cy.intercept(method, url, response).as(alias || 'apiCall');
});

// Export for TypeScript
export {};
