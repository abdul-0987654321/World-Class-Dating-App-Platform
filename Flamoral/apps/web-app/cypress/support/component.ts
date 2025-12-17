// ***********************************************************
// This file is processed and loaded automatically before your component tests.
// ***********************************************************

import '@cypress/code-coverage/support';
import './commands';
import { mount } from 'cypress/react18';

// Augment the Cypress namespace
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// Configure React testing defaults
beforeEach(() => {
  // Add any global component test setup here
});
