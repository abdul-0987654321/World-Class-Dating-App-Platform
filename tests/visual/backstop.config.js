/**
 * BackstopJS Visual Regression Testing Configuration
 * Tests for visual changes across different viewports and scenarios
 */

module.exports = {
  id: 'flamoral_visual_regression',
  viewports: [
    {
      label: 'phone',
      width: 375,
      height: 667,
    },
    {
      label: 'tablet',
      width: 768,
      height: 1024,
    },
    {
      label: 'desktop',
      width: 1920,
      height: 1080,
    },
  ],
  onBeforeScript: 'puppet/onBefore.js',
  onReadyScript: 'puppet/onReady.js',
  scenarios: [
    // Authentication Pages
    {
      label: 'Login Page',
      url: 'http://localhost:5173/login',
      delay: 500,
      misMatchThreshold: 0.1,
    },
    {
      label: 'Login Page - Error State',
      url: 'http://localhost:5173/login',
      delay: 500,
      clickSelector: '[data-testid="login-button"]',
      postInteractionWait: 1000,
    },
    {
      label: 'Registration Page',
      url: 'http://localhost:5173/register',
      delay: 500,
      misMatchThreshold: 0.1,
    },
    {
      label: 'Forgot Password Page',
      url: 'http://localhost:5173/forgot-password',
      delay: 500,
    },

    // Main Application (Authenticated)
    {
      label: 'Discovery Page',
      url: 'http://localhost:5173/discover',
      delay: 1000,
      requireSameDimensions: false,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Discovery Page - Profile Card',
      url: 'http://localhost:5173/discover',
      delay: 1000,
      clickSelector: '[data-testid="swipe-card"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Discovery Page - Filters Open',
      url: 'http://localhost:5173/discover',
      delay: 1000,
      clickSelector: '[data-testid="filters-button"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Matches Page',
      url: 'http://localhost:5173/matches',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Matches Page - Match Animation',
      url: 'http://localhost:5173/matches?showMatch=true',
      delay: 2000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Messages
    {
      label: 'Messages - Conversations List',
      url: 'http://localhost:5173/messages',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Messages - Active Conversation',
      url: 'http://localhost:5173/messages/conv-123',
      delay: 1000,
      scrollToSelector: '[data-testid="message-list"]',
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Messages - Typing Indicator',
      url: 'http://localhost:5173/messages/conv-123?typing=true',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Profile
    {
      label: 'Profile Page',
      url: 'http://localhost:5173/profile',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Profile Page - Edit Mode',
      url: 'http://localhost:5173/profile',
      delay: 1000,
      clickSelector: '[data-testid="edit-profile-button"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Profile Page - Photo Upload',
      url: 'http://localhost:5173/profile',
      delay: 1000,
      clickSelector: '[data-testid="add-photo-button"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Settings
    {
      label: 'Settings Page',
      url: 'http://localhost:5173/settings',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Settings - Preferences',
      url: 'http://localhost:5173/settings/preferences',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Settings - Privacy',
      url: 'http://localhost:5173/settings/privacy',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Subscription
    {
      label: 'Premium Page',
      url: 'http://localhost:5173/premium',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Premium Page - Monthly Plan',
      url: 'http://localhost:5173/premium',
      delay: 1000,
      clickSelector: '[data-testid="duration-monthly"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Premium Page - Annual Plan',
      url: 'http://localhost:5173/premium',
      delay: 1000,
      clickSelector: '[data-testid="duration-12-months"]',
      postInteractionWait: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Checkout Page',
      url: 'http://localhost:5173/checkout?plan=premium&duration=monthly',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Responsive Components
    {
      label: 'Navigation - Mobile',
      url: 'http://localhost:5173/discover',
      delay: 1000,
      viewports: [{ label: 'phone', width: 375, height: 667 }],
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Navigation - Tablet',
      url: 'http://localhost:5173/discover',
      delay: 1000,
      viewports: [{ label: 'tablet', width: 768, height: 1024 }],
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Dark Mode
    {
      label: 'Discovery Page - Dark Mode',
      url: 'http://localhost:5173/discover?theme=dark',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Profile Page - Dark Mode',
      url: 'http://localhost:5173/profile?theme=dark',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Loading States
    {
      label: 'Discovery - Loading State',
      url: 'http://localhost:5173/discover?loading=true',
      delay: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Messages - Loading State',
      url: 'http://localhost:5173/messages?loading=true',
      delay: 500,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Empty States
    {
      label: 'Discovery - No Profiles',
      url: 'http://localhost:5173/discover?empty=true',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Messages - No Conversations',
      url: 'http://localhost:5173/messages?empty=true',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
    {
      label: 'Matches - No Matches',
      url: 'http://localhost:5173/matches?empty=true',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },

    // Error States
    {
      label: '404 Page',
      url: 'http://localhost:5173/non-existent-page',
      delay: 500,
    },
    {
      label: 'Network Error',
      url: 'http://localhost:5173/discover?networkError=true',
      delay: 1000,
      cookiePath: 'backstop_data/engine_scripts/cookies.json',
    },
  ],
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report',
  },
  report: ['browser', 'CI'],
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox'],
    headless: 'new',
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false,
};
