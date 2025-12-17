/// <reference types="cypress" />
import 'cypress-axe';

/**
 * Accessibility Tests using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */

describe('Accessibility Tests', () => {
  const testUser = {
    email: 'a11y-test@flamoral.com',
    password: 'Test123!@#',
  };

  beforeEach(() => {
    cy.injectAxe();
  });

  describe('Authentication Pages', () => {
    it('should have no accessibility violations on login page', () => {
      cy.visit('/login');
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          'label': { enabled: true },
          'button-name': { enabled: true },
        },
      });
    });

    it('should have no accessibility violations on registration page', () => {
      cy.visit('/register');
      cy.checkA11y();
    });

    it('should have proper ARIA labels on form inputs', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Email');

      cy.get('[data-testid="password-input"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Password');
    });

    it('should announce form errors to screen readers', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]')
        .should('have.attr', 'role', 'alert')
        .and('have.attr', 'aria-live', 'assertive');
    });
  });

  describe('Main Application', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should have no accessibility violations on discovery page', () => {
      cy.visit('/discover');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should have no accessibility violations on profile page', () => {
      cy.visit('/profile');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should have no accessibility violations on messages page', () => {
      cy.visit('/messages');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should have no accessibility violations on settings page', () => {
      cy.visit('/settings');
      cy.injectAxe();
      cy.checkA11y();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should allow keyboard navigation through main nav', () => {
      cy.visit('/discover');

      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'discover-tab');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'matches-tab');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'messages-tab');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'profile-tab');
    });

    it('should allow keyboard-based swiping', () => {
      cy.visit('/discover');

      cy.get('[data-testid="swipe-card"]').focus();

      // Left arrow for pass
      cy.focused().type('{leftarrow}');
      cy.wait(500);

      cy.get('[data-testid="swipe-card"]').should('exist');

      // Right arrow for like
      cy.focused().type('{rightarrow}');
    });

    it('should trap focus in modals', () => {
      cy.visit('/profile');

      cy.get('[data-testid="edit-bio-button"]').click();

      // Tab should cycle through modal elements only
      cy.get('[data-testid="bio-textarea"]').should('be.focused');

      cy.focused().tab();
      cy.focused().should('be.within', '[data-testid="bio-modal"]');
    });

    it('should allow keyboard dismissal of modals', () => {
      cy.visit('/profile');

      cy.get('[data-testid="edit-bio-button"]').click();
      cy.get('[data-testid="bio-modal"]').should('be.visible');

      // Escape key should close modal
      cy.get('body').type('{esc}');
      cy.get('[data-testid="bio-modal"]').should('not.exist');
    });
  });

  describe('Screen Reader Support', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should have proper heading hierarchy', () => {
      cy.visit('/discover');

      cy.get('h1').should('exist');

      // Check heading levels are sequential
      cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
        const levels = $headings.map((i, el) => parseInt(el.tagName.charAt(1))).get();

        for (let i = 1; i < levels.length; i++) {
          expect(levels[i] - levels[i - 1]).to.be.at.most(1);
        }
      });
    });

    it('should announce page changes to screen readers', () => {
      cy.visit('/discover');

      cy.get('[aria-live="polite"]').should('exist');

      cy.visit('/profile');

      cy.get('[aria-live="polite"]')
        .should('exist')
        .and('contain.text', 'Profile page');
    });

    it('should have descriptive alt text for images', () => {
      cy.visit('/discover');

      cy.get('[data-testid="profile-photo"]').should('have.attr', 'alt').and('not.be.empty');
    });

    it('should announce button states', () => {
      cy.visit('/discover');

      cy.get('[data-testid="like-button"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Like');

      cy.get('[data-testid="like-button"]').click();

      cy.get('[data-testid="like-button"]')
        .should('have.attr', 'aria-pressed', 'true')
        .or('have.attr', 'aria-disabled', 'true');
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast ratios', () => {
      cy.visit('/');

      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    });

    it('should be usable in high contrast mode', () => {
      cy.visit('/discover');

      // Simulate high contrast mode
      cy.window().then((win) => {
        win.document.body.classList.add('high-contrast');
      });

      cy.checkA11y();
    });
  });

  describe('Form Accessibility', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should associate labels with inputs', () => {
      cy.visit('/profile');
      cy.get('[data-testid="edit-bio-button"]').click();

      cy.get('[data-testid="bio-textarea"]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby');
    });

    it('should provide helpful error messages', () => {
      cy.visit('/register');

      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .and('have.attr', 'role', 'alert')
        .and('contain.text', 'password'); // Should explain what's wrong
    });

    it('should mark required fields', () => {
      cy.visit('/register');

      cy.get('[data-testid="email-input"]').should('have.attr', 'required').or('have.attr', 'aria-required', 'true');
    });
  });

  describe('Interactive Elements', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should have sufficient click target size', () => {
      cy.visit('/discover');

      // WCAG 2.1 requires 44x44 CSS pixels minimum
      cy.get('[data-testid="like-button"]').then(($button) => {
        const rect = $button[0].getBoundingClientRect();
        expect(rect.width).to.be.at.least(44);
        expect(rect.height).to.be.at.least(44);
      });
    });

    it('should show focus indicators', () => {
      cy.visit('/discover');

      cy.get('[data-testid="like-button"]').focus();

      cy.get('[data-testid="like-button"]').should(($button) => {
        const styles = window.getComputedStyle($button[0]);
        // Should have visible outline or box-shadow for focus
        expect(
          styles.outline !== 'none' || styles.boxShadow !== 'none'
        ).to.be.true;
      });
    });

    it('should provide text alternatives for icons', () => {
      cy.visit('/discover');

      cy.get('[data-icon]').each(($icon) => {
        cy.wrap($icon)
          .parent()
          .should('have.attr', 'aria-label')
          .or('contain.text');
      });
    });
  });

  describe('Motion and Animation', () => {
    it('should respect prefers-reduced-motion', () => {
      cy.visit('/discover', {
        onBeforeLoad: (win) => {
          Object.defineProperty(win, 'matchMedia', {
            writable: true,
            value: (query: string) => ({
              matches: query === '(prefers-reduced-motion: reduce)',
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            }),
          });
        },
      });

      // Verify animations are disabled
      cy.get('[data-testid="swipe-card"]').should(($card) => {
        const styles = window.getComputedStyle($card[0]);
        expect(styles.animationDuration).to.equal('0s').or.equal('0.01s');
      });
    });
  });

  describe('Language and i18n', () => {
    it('should declare page language', () => {
      cy.visit('/');

      cy.get('html').should('have.attr', 'lang', 'en');
    });

    it('should mark foreign language content', () => {
      cy.visit('/profile');

      // If profile contains foreign language text, it should be marked
      cy.get('[lang]:not([lang="en"])').each(($element) => {
        cy.wrap($element).should('have.attr', 'lang');
      });
    });
  });

  describe('Skip Links', () => {
    it('should provide skip to main content link', () => {
      cy.visit('/discover');

      // Tab to first element (should be skip link)
      cy.get('body').tab();

      cy.focused().should('have.text', 'Skip to main content').or('contain.text', 'Skip');

      // Activating skip link should move focus to main content
      cy.focused().click();
      cy.focused().should('be.within', 'main');
    });
  });

  describe('Time Limits', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
    });

    it('should not have auto-advancing content without controls', () => {
      cy.visit('/discover');

      // Check for carousels/sliders with controls
      cy.get('[role="region"][aria-roledescription="carousel"]').each(($carousel) => {
        cy.wrap($carousel).within(() => {
          cy.get('[aria-label*="pause"]').or('[aria-label*="play"]').should('exist');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should announce errors in an accessible way', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('wrong@test.com');
      cy.get('[data-testid="password-input"]').type('WrongPass123!');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[role="alert"]').should('exist').and('be.visible');
    });

    it('should provide error recovery suggestions', () => {
      cy.visit('/register');

      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="password-error"]')
        .should('contain.text', 'characters')
        .or('contain.text', 'uppercase')
        .or('contain.text', 'number'); // Specific guidance
    });
  });
});
