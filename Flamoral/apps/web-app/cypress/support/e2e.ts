// ***********************************************************
// This support file is processed and loaded automatically before your test files.
// ***********************************************************

import '@cypress/code-coverage/support';
import './commands';

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing tests on certain errors
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

// Before each test
beforeEach(() => {
  // Clear cookies and local storage
  cy.clearCookies();
  cy.clearLocalStorage();

  // Set viewport
  cy.viewport(1280, 720);
});

// After each test
afterEach(() => {
  // Capture screenshots on failure
  cy.screenshot({ capture: 'runner' });
});

// Custom types
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      registerUser(userData: {
        email: string;
        password: string;
        name: string;
        dateOfBirth: string;
        gender: string;
      }): Chainable<void>;
      setupProfile(profileData: {
        bio?: string;
        interests?: string[];
        photos?: string[];
      }): Chainable<void>;
      swipeCard(direction: 'left' | 'right'): Chainable<void>;
      sendMessage(conversationId: string, message: string): Chainable<void>;
      waitForWebSocket(): Chainable<void>;
      mockGeolocation(latitude: number, longitude: number): Chainable<void>;
      interceptAPI(method: string, url: string, response: any, alias?: string): Chainable<void>;
    }
  }
}
