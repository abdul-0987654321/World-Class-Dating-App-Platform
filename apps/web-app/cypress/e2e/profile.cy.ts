/// <reference types="cypress" />

describe('Profile Management', () => {
  const testUser = {
    email: 'profile-test@flamoral.com',
    password: 'Test123!@#',
  };

  beforeEach(() => {
    cy.login(testUser.email, testUser.password);
    cy.visit('/profile');
  });

  describe('Profile View', () => {
    it('should display user profile', () => {
      cy.get('[data-testid="profile-container"]').should('be.visible');
      cy.get('[data-testid="profile-photo"]').should('be.visible');
      cy.get('[data-testid="profile-name"]').should('be.visible');
      cy.get('[data-testid="profile-age"]').should('be.visible');
      cy.get('[data-testid="profile-bio"]').should('be.visible');
    });

    it('should display all profile sections', () => {
      cy.get('[data-testid="photos-section"]').should('be.visible');
      cy.get('[data-testid="interests-section"]').should('be.visible');
      cy.get('[data-testid="prompts-section"]').should('be.visible');
      cy.get('[data-testid="preferences-section"]').should('be.visible');
    });

    it('should show profile completion percentage', () => {
      cy.get('[data-testid="profile-completion"]').should('be.visible');
      cy.get('[data-testid="completion-percentage"]').should('match', /\d+%/);
    });
  });

  describe('Photo Management', () => {
    it('should upload new photo', () => {
      cy.get('[data-testid="add-photo-button"]').click();

      cy.fixture('test-photo.jpg', 'base64').then((fileContent) => {
        cy.get('[data-testid="photo-upload-input"]').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-photo.jpg',
            mimeType: 'image/jpeg',
          },
          { force: true }
        );
      });

      cy.get('[data-testid="photo-preview"]').should('be.visible');
      cy.get('[data-testid="save-photo"]').click();

      cy.get('[data-testid="upload-success-toast"]').should('be.visible');
    });

    it('should reorder photos', () => {
      const firstPhoto = cy.get('[data-testid="photo-item"]').first();
      const lastPhoto = cy.get('[data-testid="photo-item"]').last();

      firstPhoto.drag(lastPhoto);

      cy.get('[data-testid="save-order-button"]').click();
      cy.get('[data-testid="order-saved-toast"]').should('be.visible');
    });

    it('should delete photo', () => {
      cy.get('[data-testid="photo-item"]').first().trigger('mouseover');
      cy.get('[data-testid="delete-photo-button"]').first().click();

      cy.get('[data-testid="confirm-delete-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-delete"]').click();

      cy.get('[data-testid="delete-success-toast"]').should('be.visible');
    });

    it('should set primary photo', () => {
      cy.get('[data-testid="photo-item"]').eq(2).trigger('mouseover');
      cy.get('[data-testid="set-primary-button"]').click();

      cy.get('[data-testid="photo-item"]').first().should('have.attr', 'data-primary', 'true');
    });

    it('should validate photo requirements', () => {
      cy.get('[data-testid="add-photo-button"]').click();

      // Test oversized file
      cy.fixture('large-photo.jpg').then((fileContent) => {
        cy.get('[data-testid="photo-upload-input"]').selectFile(
          {
            contents: fileContent,
            fileName: 'large-photo.jpg',
          },
          { force: true }
        );
      });

      cy.get('[data-testid="file-size-error"]').should('contain', 'too large');
    });

    it('should require at least 2 photos', () => {
      cy.get('[data-testid="photo-item"]')
        .its('length')
        .then((count) => {
          if (count > 2) {
            for (let i = count; i > 2; i--) {
              cy.get('[data-testid="photo-item"]').last().trigger('mouseover');
              cy.get('[data-testid="delete-photo-button"]').last().click();
              cy.get('[data-testid="confirm-delete"]').click();
            }
          }

          cy.get('[data-testid="photo-item"]').last().trigger('mouseover');
          cy.get('[data-testid="delete-photo-button"]').should('be.disabled');
        });
    });
  });

  describe('Bio and About', () => {
    it('should edit bio', () => {
      cy.get('[data-testid="edit-bio-button"]').click();
      cy.get('[data-testid="bio-textarea"]')
        .clear()
        .type('Updated bio: Adventure seeker, coffee enthusiast, dog lover');

      cy.get('[data-testid="save-bio-button"]').click();

      cy.get('[data-testid="profile-bio"]').should('contain', 'Updated bio');
    });

    it('should enforce bio character limit', () => {
      cy.get('[data-testid="edit-bio-button"]').click();

      const longBio = 'a'.repeat(600);
      cy.get('[data-testid="bio-textarea"]').type(longBio);

      cy.get('[data-testid="character-count"]').should('contain', '500/500');
      cy.get('[data-testid="bio-error"]').should('contain', 'maximum');
    });

    it('should update basic info', () => {
      cy.get('[data-testid="edit-info-button"]').click();

      cy.get('[data-testid="job-title-input"]').clear().type('Software Engineer');
      cy.get('[data-testid="company-input"]').clear().type('Tech Corp');
      cy.get('[data-testid="school-input"]').clear().type('State University');

      cy.get('[data-testid="save-info-button"]').click();

      cy.get('[data-testid="job-title"]').should('contain', 'Software Engineer');
    });

    it('should update location', () => {
      cy.get('[data-testid="edit-location-button"]').click();

      cy.get('[data-testid="location-search"]').type('New York');
      cy.get('[data-testid="location-suggestion"]').first().click();

      cy.get('[data-testid="save-location"]').click();
      cy.get('[data-testid="location"]').should('contain', 'New York');
    });
  });

  describe('Interests & Tags', () => {
    it('should add interests', () => {
      cy.get('[data-testid="edit-interests-button"]').click();

      const interests = ['Hiking', 'Photography', 'Cooking'];
      interests.forEach((interest) => {
        cy.get('[data-testid="interest-search"]').type(interest);
        cy.get(`[data-testid="interest-option-${interest.toLowerCase()}"]`).click();
      });

      cy.get('[data-testid="save-interests"]').click();

      interests.forEach((interest) => {
        cy.get('[data-testid="interests-section"]').should('contain', interest);
      });
    });

    it('should remove interests', () => {
      cy.get('[data-testid="edit-interests-button"]').click();

      cy.get('[data-testid="interest-tag"]')
        .first()
        .within(() => {
          cy.get('[data-testid="remove-interest"]').click();
        });

      cy.get('[data-testid="save-interests"]').click();
    });

    it('should limit number of interests', () => {
      cy.get('[data-testid="edit-interests-button"]').click();

      // Try to add more than max allowed (e.g., 10)
      for (let i = 0; i < 15; i++) {
        cy.get('[data-testid="interest-search"]').type(`Interest${i}{enter}`);
      }

      cy.get('[data-testid="interest-tag"]').should('have.length.at.most', 10);
    });
  });

  describe('Profile Prompts', () => {
    it('should add profile prompt', () => {
      cy.get('[data-testid="add-prompt-button"]').click();

      cy.get('[data-testid="prompt-selector"]').click();
      cy.get('[data-testid="prompt-option"]').first().click();

      cy.get('[data-testid="prompt-answer"]').type('My thoughtful answer to this prompt');

      cy.get('[data-testid="save-prompt"]').click();

      cy.get('[data-testid="prompts-section"]').should('contain', 'My thoughtful answer');
    });

    it('should edit existing prompt', () => {
      cy.get('[data-testid="prompt-item"]')
        .first()
        .within(() => {
          cy.get('[data-testid="edit-prompt"]').click();
        });

      cy.get('[data-testid="prompt-answer"]').clear().type('Updated answer');

      cy.get('[data-testid="save-prompt"]').click();
    });

    it('should delete prompt', () => {
      cy.get('[data-testid="prompt-item"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-prompt"]').click();
        });

      cy.get('[data-testid="confirm-delete"]').click();
      cy.get('[data-testid="delete-success-toast"]').should('be.visible');
    });

    it('should limit prompt length', () => {
      cy.get('[data-testid="add-prompt-button"]').click();
      cy.get('[data-testid="prompt-selector"]').click();
      cy.get('[data-testid="prompt-option"]').first().click();

      const longAnswer = 'a'.repeat(300);
      cy.get('[data-testid="prompt-answer"]').type(longAnswer);

      cy.get('[data-testid="character-count"]').should('contain', '150/150');
    });
  });

  describe('Preferences', () => {
    beforeEach(() => {
      cy.get('[data-testid="preferences-tab"]').click();
    });

    it('should update age preference', () => {
      cy.get('[data-testid="age-min-slider"]').invoke('val', 25).trigger('change');

      cy.get('[data-testid="age-max-slider"]').invoke('val', 35).trigger('change');

      cy.get('[data-testid="save-preferences"]').click();

      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('should update distance preference', () => {
      cy.get('[data-testid="distance-slider"]').invoke('val', 25).trigger('change');

      cy.get('[data-testid="distance-value"]').should('contain', '25');
      cy.get('[data-testid="save-preferences"]').click();
    });

    it('should update gender preference', () => {
      cy.get('[data-testid="gender-women"]').click();
      cy.get('[data-testid="save-preferences"]').click();

      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('should toggle deal breakers', () => {
      cy.get('[data-testid="dealbreaker-smoking"]').click();
      cy.get('[data-testid="dealbreaker-smoking"]').should('be.checked');

      cy.get('[data-testid="save-preferences"]').click();
    });
  });

  describe('Settings & Privacy', () => {
    beforeEach(() => {
      cy.get('[data-testid="settings-tab"]').click();
    });

    it('should toggle profile visibility', () => {
      cy.get('[data-testid="profile-visibility-toggle"]').click();

      cy.get('[data-testid="confirm-hide-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-hide"]').click();

      cy.get('[data-testid="hidden-profile-indicator"]').should('be.visible');
    });

    it('should update notification preferences', () => {
      cy.get('[data-testid="notifications-section"]').within(() => {
        cy.get('[data-testid="email-notifications"]').click();
        cy.get('[data-testid="push-notifications"]').click();
        cy.get('[data-testid="match-notifications"]').click();
      });

      cy.get('[data-testid="save-settings"]').click();
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('should update privacy settings', () => {
      cy.get('[data-testid="show-age-toggle"]').click();
      cy.get('[data-testid="show-distance-toggle"]').click();
      cy.get('[data-testid="incognito-mode"]').click();

      cy.get('[data-testid="save-settings"]').click();
    });

    it('should change password', () => {
      cy.get('[data-testid="change-password-button"]').click();

      cy.get('[data-testid="current-password"]').type('Test123!@#');
      cy.get('[data-testid="new-password"]').type('NewPass123!@#');
      cy.get('[data-testid="confirm-new-password"]').type('NewPass123!@#');

      cy.get('[data-testid="save-password"]').click();

      cy.get('[data-testid="password-changed-toast"]').should('be.visible');
    });
  });

  describe('Account Management', () => {
    it('should deactivate account', () => {
      cy.get('[data-testid="settings-tab"]').click();
      cy.get('[data-testid="deactivate-account-button"]').click();

      cy.get('[data-testid="deactivate-modal"]').should('be.visible');
      cy.get('[data-testid="deactivate-reason"]').select('Taking a break');
      cy.get('[data-testid="confirm-deactivate"]').click();

      cy.url().should('include', '/goodbye');
    });

    it('should delete account', () => {
      cy.get('[data-testid="settings-tab"]').click();
      cy.get('[data-testid="delete-account-button"]').click();

      cy.get('[data-testid="delete-modal"]').should('be.visible');
      cy.get('[data-testid="delete-confirmation-input"]').type('DELETE');
      cy.get('[data-testid="confirm-delete"]').click();

      cy.url().should('include', '/account-deleted');
    });
  });

  describe('Profile Verification', () => {
    it('should start verification process', () => {
      cy.get('[data-testid="verify-profile-button"]').click();

      cy.get('[data-testid="verification-modal"]').should('be.visible');
      cy.get('[data-testid="verification-instructions"]').should('be.visible');
    });

    it('should upload verification photo', () => {
      cy.get('[data-testid="verify-profile-button"]').click();

      cy.fixture('verification-photo.jpg').then((fileContent) => {
        cy.get('[data-testid="verification-upload"]').selectFile(
          {
            contents: fileContent,
            fileName: 'verification-photo.jpg',
          },
          { force: true }
        );
      });

      cy.get('[data-testid="submit-verification"]').click();
      cy.get('[data-testid="verification-submitted-toast"]').should('be.visible');
    });

    it('should display verification badge', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('verified', 'true');
      });

      cy.reload();

      cy.get('[data-testid="verified-badge"]').should('be.visible');
    });
  });

  describe('Profile Preview', () => {
    it('should show profile as others see it', () => {
      cy.get('[data-testid="preview-profile-button"]').click();

      cy.get('[data-testid="profile-preview-modal"]').should('be.visible');
      cy.get('[data-testid="preview-card"]').should('be.visible');
    });

    it('should highlight incomplete sections', () => {
      cy.get('[data-testid="profile-completion"]').click();

      cy.get('[data-testid="incomplete-section"]').should('be.visible');
      cy.get('[data-testid="complete-section-cta"]').should('be.visible');
    });
  });

  describe('Validation & Error Handling', () => {
    it('should validate required fields', () => {
      cy.get('[data-testid="edit-bio-button"]').click();
      cy.get('[data-testid="bio-textarea"]').clear();
      cy.get('[data-testid="save-bio-button"]').click();

      cy.get('[data-testid="bio-required-error"]').should('be.visible');
    });

    it('should handle upload failures', () => {
      cy.interceptAPI(
        'POST',
        '**/api/v1/media/upload',
        {
          statusCode: 500,
        },
        'uploadFail'
      );

      cy.get('[data-testid="add-photo-button"]').click();
      cy.fixture('test-photo.jpg').then((fileContent) => {
        cy.get('[data-testid="photo-upload-input"]').selectFile(
          {
            contents: fileContent,
            fileName: 'test-photo.jpg',
          },
          { force: true }
        );
      });

      cy.get('[data-testid="save-photo"]').click();
      cy.wait('@uploadFail');

      cy.get('[data-testid="upload-error-toast"]').should('be.visible');
    });

    it('should handle save failures gracefully', () => {
      cy.interceptAPI(
        'PUT',
        '**/api/v1/users/profile',
        {
          statusCode: 500,
        },
        'saveFail'
      );

      cy.get('[data-testid="edit-bio-button"]').click();
      cy.get('[data-testid="bio-textarea"]').type('New bio');
      cy.get('[data-testid="save-bio-button"]').click();

      cy.wait('@saveFail');
      cy.get('[data-testid="error-toast"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });
  });
});
