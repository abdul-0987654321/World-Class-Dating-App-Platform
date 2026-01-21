/// <reference types="cypress" />

describe('Discovery & Swiping', () => {
  const testUser = {
    email: 'discovery-test@flamoral.com',
    password: 'Test123!@#',
  };

  beforeEach(() => {
    cy.login(testUser.email, testUser.password);
    cy.mockGeolocation(40.7128, -74.006); // New York coordinates
    cy.visit('/discover');
  });

  describe('Card Display', () => {
    it('should display discovery cards', () => {
      cy.get('[data-testid="swipe-card"]').should('be.visible');
      cy.get('[data-testid="profile-photo"]').should('be.visible');
      cy.get('[data-testid="profile-name"]').should('be.visible');
      cy.get('[data-testid="profile-age"]').should('be.visible');
    });

    it('should show profile details on card', () => {
      cy.get('[data-testid="swipe-card"]')
        .first()
        .within(() => {
          cy.get('[data-testid="profile-name"]').should('not.be.empty');
          cy.get('[data-testid="profile-age"]').should('match', /\d+/);
          cy.get('[data-testid="distance"]').should('be.visible');
        });
    });

    it('should display multiple photos in carousel', () => {
      cy.get('[data-testid="photo-carousel"]').should('be.visible');
      cy.get('[data-testid="photo-indicator"]').should('have.length.at.least', 1);

      cy.get('[data-testid="next-photo"]').click();
      cy.get('[data-testid="active-photo-indicator"]').should('have.attr', 'data-index', '1');
    });

    it('should show bio and interests', () => {
      cy.get('[data-testid="expand-profile"]').click();
      cy.get('[data-testid="profile-bio"]').should('be.visible');
      cy.get('[data-testid="profile-interests"]').should('be.visible');
      cy.get('[data-testid="interest-tag"]').should('have.length.at.least', 1);
    });
  });

  describe('Swiping Mechanics', () => {
    it('should swipe right (like)', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'swipeRight');

      const initialCardName = cy.get('[data-testid="profile-name"]').first().invoke('text');

      cy.swipeCard('right');

      cy.wait('@swipeRight').its('request.body').should('deep.include', {
        direction: 'right',
      });

      // Verify new card is displayed
      cy.get('[data-testid="profile-name"]')
        .first()
        .invoke('text')
        .should('not.eq', initialCardName);
    });

    it('should swipe left (pass)', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'swipeLeft');

      cy.swipeCard('left');

      cy.wait('@swipeLeft').its('request.body').should('deep.include', {
        direction: 'left',
      });
    });

    it('should handle like button click', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'like');

      cy.get('[data-testid="like-button"]').click();

      cy.wait('@like');
      cy.get('[data-testid="swipe-card"]').should('be.visible');
    });

    it('should handle pass button click', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'pass');

      cy.get('[data-testid="pass-button"]').click();

      cy.wait('@pass');
    });

    it('should handle super like', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'superLike');

      cy.get('[data-testid="super-like-button"]').click();

      cy.wait('@superLike').its('request.body').should('deep.include', {
        superLike: true,
      });
    });

    it('should show match animation on mutual like', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: true }, 'matchSwipe');

      cy.swipeCard('right');

      cy.wait('@matchSwipe');
      cy.get('[data-testid="match-animation"]').should('be.visible');
      cy.get('[data-testid="match-message"]').should('contain', "It's a Match");
    });
  });

  describe('Filters & Preferences', () => {
    beforeEach(() => {
      cy.get('[data-testid="filters-button"]').click();
    });

    it('should display filter options', () => {
      cy.get('[data-testid="filter-modal"]').should('be.visible');
      cy.get('[data-testid="age-range-slider"]').should('be.visible');
      cy.get('[data-testid="distance-slider"]').should('be.visible');
      cy.get('[data-testid="gender-preference"]').should('be.visible');
    });

    it('should update age range filter', () => {
      cy.interceptAPI('PUT', '**/api/v1/users/preferences', { success: true }, 'updatePrefs');

      cy.get('[data-testid="age-min-input"]').clear().type('25');
      cy.get('[data-testid="age-max-input"]').clear().type('35');
      cy.get('[data-testid="apply-filters"]').click();

      cy.wait('@updatePrefs')
        .its('request.body')
        .should('deep.include', {
          ageRange: { min: 25, max: 35 },
        });
    });

    it('should update distance filter', () => {
      cy.interceptAPI('PUT', '**/api/v1/users/preferences', { success: true }, 'updateDistance');

      cy.get('[data-testid="distance-slider"]').invoke('val', 50).trigger('change');

      cy.get('[data-testid="apply-filters"]').click();

      cy.wait('@updateDistance');
    });

    it('should filter by interests', () => {
      cy.get('[data-testid="interest-filter-music"]').click();
      cy.get('[data-testid="interest-filter-sports"]').click();
      cy.get('[data-testid="apply-filters"]').click();

      cy.get('[data-testid="filter-modal"]').should('not.be.visible');
    });
  });

  describe('No More Profiles', () => {
    it('should show message when no more profiles', () => {
      cy.interceptAPI('GET', '**/api/v1/matches/discover', { profiles: [] }, 'noProfiles');

      cy.visit('/discover');
      cy.wait('@noProfiles');

      cy.get('[data-testid="no-profiles-message"]').should('be.visible');
      cy.get('[data-testid="expand-filters-suggestion"]').should('be.visible');
    });

    it('should allow expanding search radius', () => {
      cy.get('[data-testid="no-profiles-message"]').should('be.visible');
      cy.get('[data-testid="expand-radius-button"]').click();

      cy.get('[data-testid="distance-increased-toast"]').should('be.visible');
    });
  });

  describe('Undo Feature (Premium)', () => {
    it('should show undo button for premium users', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'premium');
      });

      cy.visit('/discover');
      cy.get('[data-testid="undo-button"]').should('be.visible');
    });

    it('should undo last swipe', () => {
      cy.interceptAPI('POST', '**/api/v1/matches/undo', { success: true }, 'undo');

      cy.swipeCard('left');
      cy.get('[data-testid="undo-button"]').click();

      cy.wait('@undo');
      cy.get('[data-testid="undo-success-toast"]').should('be.visible');
    });

    it('should show upgrade prompt for free users', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'free');
      });

      cy.visit('/discover');
      cy.get('[data-testid="undo-button"]').should('not.exist');
    });
  });

  describe('Geolocation', () => {
    it('should request location permission', () => {
      cy.mockGeolocation(51.5074, -0.1278); // London coordinates

      cy.visit('/discover');

      cy.get('[data-testid="location-enabled"]').should('exist');
    });

    it('should handle location permission denied', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success, error) => {
          error({
            code: 1,
            message: 'User denied geolocation',
          });
        });
      });

      cy.visit('/discover');
      cy.get('[data-testid="location-error"]').should('be.visible');
    });

    it('should show distance in user preference units', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('distanceUnit', 'miles');
      });

      cy.visit('/discover');
      cy.get('[data-testid="distance"]').should('contain', 'mi');
    });
  });

  describe('Performance & Loading', () => {
    it('should show loading skeleton while fetching profiles', () => {
      cy.interceptAPI(
        'GET',
        '**/api/v1/matches/discover',
        {
          delay: 2000,
          body: { profiles: [] },
        },
        'slowLoad'
      );

      cy.visit('/discover');
      cy.get('[data-testid="card-skeleton"]').should('be.visible');
      cy.wait('@slowLoad');
    });

    it('should preload next profiles', () => {
      cy.interceptAPI('GET', '**/api/v1/matches/discover*', { profiles: [] }, 'preload');

      cy.swipeCard('right');
      cy.swipeCard('right');

      cy.wait('@preload');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.interceptAPI(
        'POST',
        '**/api/v1/matches/swipe',
        {
          statusCode: 500,
          body: { error: 'Server error' },
        },
        'serverError'
      );

      cy.swipeCard('right');

      cy.wait('@serverError');
      cy.get('[data-testid="error-toast"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should retry failed swipes', () => {
      cy.interceptAPI(
        'POST',
        '**/api/v1/matches/swipe',
        {
          statusCode: 500,
        },
        'failedSwipe'
      );

      cy.swipeCard('right');
      cy.wait('@failedSwipe');

      cy.interceptAPI('POST', '**/api/v1/matches/swipe', { match: false }, 'retrySwipe');

      cy.get('[data-testid="retry-button"]').click();
      cy.wait('@retrySwipe');
    });
  });
});
