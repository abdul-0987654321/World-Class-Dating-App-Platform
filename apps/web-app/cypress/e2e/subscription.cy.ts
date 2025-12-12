/// <reference types="cypress" />

describe('Subscription & Payments', () => {
  const testUser = {
    email: 'subscription-test@flamoral.com',
    password: 'Test123!@#',
  };

  beforeEach(() => {
    cy.login(testUser.email, testUser.password);
  });

  describe('Pricing Page', () => {
    beforeEach(() => {
      cy.visit('/premium');
    });

    it('should display all subscription tiers', () => {
      cy.get('[data-testid="pricing-container"]').should('be.visible');
      cy.get('[data-testid="plan-basic"]').should('be.visible');
      cy.get('[data-testid="plan-premium"]').should('be.visible');
      cy.get('[data-testid="plan-platinum"]').should('be.visible');
    });

    it('should display plan features', () => {
      cy.get('[data-testid="plan-premium"]').within(() => {
        cy.get('[data-testid="feature-unlimited-likes"]').should('be.visible');
        cy.get('[data-testid="feature-rewind"]').should('be.visible');
        cy.get('[data-testid="feature-super-likes"]').should('be.visible');
        cy.get('[data-testid="feature-boosts"]').should('be.visible');
      });
    });

    it('should display pricing for different durations', () => {
      cy.get('[data-testid="duration-monthly"]').click();
      cy.get('[data-testid="plan-premium"]').should('contain', '$');

      cy.get('[data-testid="duration-6-months"]').click();
      cy.get('[data-testid="plan-premium"]').should('contain', 'Save');

      cy.get('[data-testid="duration-12-months"]').click();
      cy.get('[data-testid="savings-badge"]').should('be.visible');
    });

    it('should highlight recommended plan', () => {
      cy.get('[data-testid="plan-premium"]')
        .should('have.attr', 'data-recommended', 'true');

      cy.get('[data-testid="recommended-badge"]').should('be.visible');
    });
  });

  describe('Checkout Flow', () => {
    beforeEach(() => {
      cy.visit('/premium');
    });

    it('should select plan and proceed to checkout', () => {
      cy.get('[data-testid="plan-premium"]').within(() => {
        cy.get('[data-testid="select-plan-button"]').click();
      });

      cy.url().should('include', '/checkout');
      cy.get('[data-testid="checkout-container"]').should('be.visible');
    });

    it('should display order summary', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.get('[data-testid="order-summary"]').should('be.visible');
      cy.get('[data-testid="plan-name"]').should('contain', 'Premium');
      cy.get('[data-testid="billing-period"]').should('contain', 'Monthly');
      cy.get('[data-testid="subtotal"]').should('be.visible');
      cy.get('[data-testid="total"]').should('be.visible');
    });

    it('should apply promo code', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.get('[data-testid="promo-code-input"]').type('SAVE20');
      cy.get('[data-testid="apply-promo"]').click();

      cy.get('[data-testid="discount-applied"]').should('be.visible');
      cy.get('[data-testid="discount-amount"]').should('contain', '20%');
    });

    it('should show error for invalid promo code', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.interceptAPI('POST', '**/api/v1/payments/validate-promo', {
        statusCode: 400,
        body: { error: 'Invalid promo code' },
      }, 'invalidPromo');

      cy.get('[data-testid="promo-code-input"]').type('INVALID');
      cy.get('[data-testid="apply-promo"]').click();

      cy.wait('@invalidPromo');
      cy.get('[data-testid="promo-error"]').should('contain', 'Invalid');
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      cy.visit('/checkout?plan=premium&duration=monthly');
    });

    it('should display payment form', () => {
      cy.get('[data-testid="payment-form"]').should('be.visible');
      cy.get('[data-testid="card-element"]').should('be.visible');
      cy.get('[data-testid="billing-address"]').should('be.visible');
    });

    it('should process successful payment', () => {
      cy.interceptAPI('POST', '**/api/v1/payments/subscribe', {
        success: true,
        subscriptionId: 'sub_123',
      }, 'subscribe');

      // Stripe test card
      cy.get('[data-testid="card-element"]').within(() => {
        cy.get('input[name="cardnumber"]').type('4242424242424242');
        cy.get('input[name="exp-date"]').type('1225');
        cy.get('input[name="cvc"]').type('123');
        cy.get('input[name="postal"]').type('10001');
      });

      cy.get('[data-testid="submit-payment"]').click();

      cy.wait('@subscribe');
      cy.url().should('include', '/subscription/success');
    });

    it('should handle payment failure', () => {
      cy.interceptAPI('POST', '**/api/v1/payments/subscribe', {
        statusCode: 400,
        body: { error: 'Payment declined' },
      }, 'failedPayment');

      cy.get('[data-testid="card-element"]').within(() => {
        cy.get('input[name="cardnumber"]').type('4000000000000002'); // Declined card
        cy.get('input[name="exp-date"]').type('1225');
        cy.get('input[name="cvc"]').type('123');
        cy.get('input[name="postal"]').type('10001');
      });

      cy.get('[data-testid="submit-payment"]').click();

      cy.wait('@failedPayment');
      cy.get('[data-testid="payment-error"]').should('contain', 'declined');
    });

    it('should validate card information', () => {
      cy.get('[data-testid="card-element"]').within(() => {
        cy.get('input[name="cardnumber"]').type('1234');
      });

      cy.get('[data-testid="card-error"]').should('be.visible');
    });

    it('should show processing indicator', () => {
      cy.get('[data-testid="card-element"]').within(() => {
        cy.get('input[name="cardnumber"]').type('4242424242424242');
        cy.get('input[name="exp-date"]').type('1225');
        cy.get('input[name="cvc"]').type('123');
        cy.get('input[name="postal"]').type('10001');
      });

      cy.get('[data-testid="submit-payment"]').click();

      cy.get('[data-testid="processing-indicator"]').should('be.visible');
      cy.get('[data-testid="submit-payment"]').should('be.disabled');
    });
  });

  describe('Subscription Success', () => {
    beforeEach(() => {
      cy.visit('/subscription/success?subscriptionId=sub_123');
    });

    it('should display success message', () => {
      cy.get('[data-testid="success-container"]').should('be.visible');
      cy.get('[data-testid="success-message"]').should('contain', 'Welcome to Premium');
    });

    it('should show subscription details', () => {
      cy.get('[data-testid="subscription-details"]').should('be.visible');
      cy.get('[data-testid="next-billing-date"]').should('be.visible');
      cy.get('[data-testid="subscription-amount"]').should('be.visible');
    });

    it('should provide navigation to use features', () => {
      cy.get('[data-testid="start-swiping-button"]').click();
      cy.url().should('include', '/discover');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'premium');
      });
      cy.visit('/settings/subscription');
    });

    it('should display current subscription', () => {
      cy.get('[data-testid="current-plan"]').should('contain', 'Premium');
      cy.get('[data-testid="subscription-status"]').should('contain', 'Active');
      cy.get('[data-testid="next-billing-date"]').should('be.visible');
      cy.get('[data-testid="subscription-amount"]').should('be.visible');
    });

    it('should show payment method', () => {
      cy.get('[data-testid="payment-method"]').should('be.visible');
      cy.get('[data-testid="card-last-four"]').should('match', /\d{4}/);
      cy.get('[data-testid="card-expiry"]').should('be.visible');
    });

    it('should update payment method', () => {
      cy.get('[data-testid="update-payment-button"]').click();

      cy.get('[data-testid="payment-modal"]').should('be.visible');

      cy.get('[data-testid="new-card-element"]').within(() => {
        cy.get('input[name="cardnumber"]').type('4242424242424242');
        cy.get('input[name="exp-date"]').type('1226');
        cy.get('input[name="cvc"]').type('456');
        cy.get('input[name="postal"]').type('10001');
      });

      cy.get('[data-testid="save-payment-method"]').click();

      cy.get('[data-testid="payment-updated-toast"]').should('be.visible');
    });

    it('should change subscription plan', () => {
      cy.get('[data-testid="change-plan-button"]').click();

      cy.get('[data-testid="plan-options"]').should('be.visible');
      cy.get('[data-testid="upgrade-to-platinum"]').click();

      cy.get('[data-testid="confirm-upgrade-modal"]').should('be.visible');
      cy.get('[data-testid="proration-info"]').should('be.visible');
      cy.get('[data-testid="confirm-upgrade"]').click();

      cy.get('[data-testid="upgrade-success-toast"]').should('be.visible');
    });

    it('should cancel subscription', () => {
      cy.get('[data-testid="cancel-subscription-button"]').click();

      cy.get('[data-testid="cancel-modal"]').should('be.visible');
      cy.get('[data-testid="cancel-reason"]').select('Too expensive');
      cy.get('[data-testid="feedback-text"]').type('Optional feedback');

      cy.get('[data-testid="confirm-cancel"]').click();

      cy.get('[data-testid="cancellation-confirmed"]').should('be.visible');
      cy.get('[data-testid="access-until"]').should('be.visible');
    });

    it('should reactivate cancelled subscription', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('subscriptionStatus', 'cancelled');
      });

      cy.reload();

      cy.get('[data-testid="reactivate-button"]').should('be.visible');
      cy.get('[data-testid="reactivate-button"]').click();

      cy.get('[data-testid="reactivation-success-toast"]').should('be.visible');
    });
  });

  describe('Billing History', () => {
    beforeEach(() => {
      cy.visit('/settings/billing-history');
    });

    it('should display billing history', () => {
      cy.get('[data-testid="billing-history"]').should('be.visible');
      cy.get('[data-testid="invoice-item"]').should('have.length.at.least', 1);
    });

    it('should show invoice details', () => {
      cy.get('[data-testid="invoice-item"]').first().within(() => {
        cy.get('[data-testid="invoice-date"]').should('be.visible');
        cy.get('[data-testid="invoice-amount"]').should('be.visible');
        cy.get('[data-testid="invoice-status"]').should('be.visible');
      });
    });

    it('should download invoice', () => {
      cy.get('[data-testid="invoice-item"]').first().within(() => {
        cy.get('[data-testid="download-invoice"]').click();
      });

      // Verify download initiated
      cy.get('[data-testid="download-started-toast"]').should('be.visible');
    });
  });

  describe('In-App Purchases (IAP)', () => {
    it('should purchase boost', () => {
      cy.visit('/boost');

      cy.get('[data-testid="boost-package-1"]').click();
      cy.get('[data-testid="purchase-boost"]').click();

      cy.get('[data-testid="payment-modal"]').should('be.visible');
      cy.get('[data-testid="boost-price"]').should('be.visible');

      cy.get('[data-testid="confirm-purchase"]').click();

      cy.get('[data-testid="purchase-success"]').should('be.visible');
    });

    it('should purchase super likes', () => {
      cy.visit('/super-likes');

      cy.get('[data-testid="super-like-package-5"]').click();
      cy.get('[data-testid="purchase-super-likes"]').click();

      cy.get('[data-testid="confirm-purchase"]').click();

      cy.get('[data-testid="super-likes-added"]').should('be.visible');
    });

    it('should show remaining boost count', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('boostCount', '3');
      });

      cy.visit('/discover');

      cy.get('[data-testid="boost-button"]').trigger('mouseover');
      cy.get('[data-testid="boost-tooltip"]').should('contain', '3 remaining');
    });
  });

  describe('Free Trial', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'free');
        win.localStorage.removeItem('hasTrialed');
      });
    });

    it('should display free trial offer', () => {
      cy.visit('/premium');

      cy.get('[data-testid="trial-banner"]').should('be.visible');
      cy.get('[data-testid="trial-duration"]').should('contain', '7 days');
    });

    it('should start free trial', () => {
      cy.visit('/premium');

      cy.get('[data-testid="start-trial-button"]').click();

      cy.url().should('include', '/checkout');
      cy.get('[data-testid="trial-notice"]').should('be.visible');
    });

    it('should not show trial for existing subscribers', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('hasTrialed', 'true');
      });

      cy.visit('/premium');

      cy.get('[data-testid="trial-banner"]').should('not.exist');
    });
  });

  describe('Feature Upsells', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'free');
      });
    });

    it('should show upsell when using premium feature', () => {
      cy.visit('/discover');

      cy.swipeCard('left');
      cy.get('[data-testid="undo-button"]').click();

      cy.get('[data-testid="upsell-modal"]').should('be.visible');
      cy.get('[data-testid="upsell-feature"]').should('contain', 'Rewind');
    });

    it('should navigate to upgrade from upsell', () => {
      cy.visit('/discover');

      cy.get('[data-testid="super-like-button"]').click();
      cy.get('[data-testid="super-like-button"]').click();
      cy.get('[data-testid="super-like-button"]').click();

      cy.get('[data-testid="out-of-super-likes"]').should('be.visible');
      cy.get('[data-testid="upgrade-to-premium"]').click();

      cy.url().should('include', '/premium');
    });
  });

  describe('Refunds', () => {
    beforeEach(() => {
      cy.visit('/settings/subscription');
    });

    it('should request refund', () => {
      cy.get('[data-testid="request-refund-button"]').click();

      cy.get('[data-testid="refund-modal"]').should('be.visible');
      cy.get('[data-testid="refund-reason"]').select('Not satisfied with service');
      cy.get('[data-testid="refund-details"]').type('Reason for refund request');

      cy.get('[data-testid="submit-refund-request"]').click();

      cy.get('[data-testid="refund-submitted"]').should('be.visible');
    });

    it('should show refund policy', () => {
      cy.get('[data-testid="refund-policy-link"]').click();

      cy.get('[data-testid="policy-modal"]').should('be.visible');
      cy.get('[data-testid="policy-content"]').should('contain', '30 days');
    });
  });

  describe('Security & Compliance', () => {
    it('should display secure payment badge', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.get('[data-testid="secure-payment-badge"]').should('be.visible');
      cy.get('[data-testid="ssl-indicator"]').should('be.visible');
    });

    it('should show payment provider logos', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.get('[data-testid="stripe-logo"]').should('be.visible');
      cy.get('[data-testid="payment-cards"]').should('be.visible');
    });

    it('should link to terms and privacy', () => {
      cy.visit('/checkout?plan=premium&duration=monthly');

      cy.get('[data-testid="terms-link"]').should('be.visible');
      cy.get('[data-testid="privacy-link"]').should('be.visible');
    });
  });
});
