/**
 * Emotional Availability Indicator Service Tests
 */

import {
  EmotionalAvailabilityService,
  EmotionalState,
  AvailabilityWindow,
  EmotionalCompatibility,
  UserEmotionalProfile,
  EmotionalPrivacySettings,
} from '../profile/emotional-availability.service';

describe('EmotionalAvailabilityService', () => {
  let service: EmotionalAvailabilityService;

  // Use a userId that passes the feature flag (test user prefix)
  const enabledUserId = 'emotional-test-user-1';
  const enabledUserId2 = 'emotional-test-user-2';
  const disabledUserId = 'regular-user-123';

  beforeEach(() => {
    service = new EmotionalAvailabilityService();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  // ===========================================================================
  // Feature Flag Tests
  // ===========================================================================
  describe('Feature Flag', () => {
    it('should enable feature for test users', () => {
      expect(service.isFeatureAvailable(enabledUserId)).toBe(true);
    });

    it('should disable feature for regular users (0% rollout)', () => {
      expect(service.isFeatureAvailable(disabledUserId)).toBe(false);
    });

    it('should return null when setting state for disabled user', () => {
      const result = service.setEmotionalState(disabledUserId, 'open_to_connect');
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // State Management Tests
  // ===========================================================================
  describe('State Management', () => {
    describe('setEmotionalState', () => {
      it('should set emotional state for enabled user', () => {
        const result = service.setEmotionalState(enabledUserId, 'open_to_connect');

        expect(result).not.toBeNull();
        expect(result?.currentState?.state).toBe('open_to_connect');
        expect(result?.currentState?.autoExpire).toBe(false);
      });

      it('should set state with duration and auto-expire', () => {
        const result = service.setEmotionalState(enabledUserId, 'casual_chat', 60);

        expect(result).not.toBeNull();
        expect(result?.currentState?.state).toBe('casual_chat');
        expect(result?.currentState?.autoExpire).toBe(true);
        expect(result?.currentState?.endTime).not.toBeNull();
      });

      it('should archive previous state when setting new state', () => {
        service.setEmotionalState(enabledUserId, 'open_to_connect');

        // Wait a small amount to ensure different timestamps
        const result = service.setEmotionalState(enabledUserId, 'deep_conversations');

        expect(result?.stateHistory.length).toBe(1);
        expect(result?.stateHistory[0].state).toBe('open_to_connect');
        expect(result?.currentState?.state).toBe('deep_conversations');
      });

      it('should handle all emotional states', () => {
        const states: EmotionalState[] = [
          'open_to_connect',
          'casual_chat',
          'deep_conversations',
          'need_space',
          'feeling_adventurous',
          'seeking_comfort',
        ];

        states.forEach((state) => {
          const result = service.setEmotionalState(enabledUserId, state);
          expect(result?.currentState?.state).toBe(state);
        });
      });
    });

    describe('getEmotionalState', () => {
      it('should return null for user without state', () => {
        const result = service.getEmotionalState(enabledUserId);
        expect(result).toBeNull();
      });

      it('should return current state for user with state', () => {
        service.setEmotionalState(enabledUserId, 'feeling_adventurous');

        const result = service.getEmotionalState(enabledUserId);

        expect(result).not.toBeNull();
        expect(result?.state).toBe('feeling_adventurous');
      });

      it('should return null for disabled user', () => {
        const result = service.getEmotionalState(disabledUserId);
        expect(result).toBeNull();
      });
    });

    describe('getEmotionalProfile', () => {
      it('should return default profile for new user', () => {
        const profile = service.getEmotionalProfile(enabledUserId);

        expect(profile).not.toBeNull();
        expect(profile?.userId).toBe(enabledUserId);
        expect(profile?.currentState).toBeNull();
        expect(profile?.stateHistory).toHaveLength(0);
        expect(profile?.privacySettings.visibility).toBe('matches_only');
      });

      it('should return null for disabled user', () => {
        const profile = service.getEmotionalProfile(disabledUserId);
        expect(profile).toBeNull();
      });
    });

    describe('clearEmotionalState', () => {
      it('should clear the current state', () => {
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.clearEmotionalState(enabledUserId);

        const state = service.getEmotionalState(enabledUserId);
        expect(state).toBeNull();
      });

      it('should archive cleared state to history', () => {
        service.setEmotionalState(enabledUserId, 'seeking_comfort');
        service.clearEmotionalState(enabledUserId);

        const profile = service.getEmotionalProfile(enabledUserId);
        expect(profile?.stateHistory.length).toBe(1);
        expect(profile?.stateHistory[0].state).toBe('seeking_comfort');
      });
    });
  });

  // ===========================================================================
  // Compatibility Tests
  // ===========================================================================
  describe('Compatibility Calculations', () => {
    describe('calculateEmotionalCompatibility', () => {
      it('should return neutral compatibility for null states', () => {
        const result = service.calculateEmotionalCompatibility(null, 'open_to_connect');

        expect(result.score).toBe(50);
        expect(result.compatibilityLevel).toBe('medium');
      });

      it('should return high compatibility for matching open states', () => {
        const result = service.calculateEmotionalCompatibility(
          'open_to_connect',
          'open_to_connect'
        );

        expect(result.score).toBe(95);
        expect(result.compatibilityLevel).toBe('high');
        expect(result.complementaryStates).toBe(true);
      });

      it('should return low compatibility with need_space', () => {
        const result = service.calculateEmotionalCompatibility(
          'open_to_connect',
          'need_space'
        );

        expect(result.score).toBe(10);
        expect(result.compatibilityLevel).toBe('incompatible');
      });

      it('should return medium compatibility for casual_chat + deep_conversations', () => {
        const result = service.calculateEmotionalCompatibility(
          'casual_chat',
          'deep_conversations'
        );

        expect(result.score).toBe(50);
        expect(result.compatibilityLevel).toBe('medium');
      });

      it('should return high compatibility for adventurous states', () => {
        const result = service.calculateEmotionalCompatibility(
          'feeling_adventurous',
          'feeling_adventurous'
        );

        expect(result.score).toBe(95);
        expect(result.compatibilityLevel).toBe('high');
        expect(result.complementaryStates).toBe(true);
      });

      it('should provide conversation suggestions', () => {
        const result = service.calculateEmotionalCompatibility(
          'deep_conversations',
          'deep_conversations'
        );

        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should provide special suggestions for need_space', () => {
        const result = service.calculateEmotionalCompatibility(
          'open_to_connect',
          'need_space'
        );

        expect(result.suggestions).toContain('Respect their need for space');
      });
    });

    describe('suggestMatchesForMood', () => {
      beforeEach(() => {
        // Set up some test users with different states
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId2, 'deep_conversations');
      });

      it('should return empty array for disabled user', () => {
        const suggestions = service.suggestMatchesForMood(disabledUserId, undefined, [
          enabledUserId,
        ]);
        expect(suggestions).toHaveLength(0);
      });

      it('should sort matches by compatibility score', () => {
        // Create test users
        const testUser1 = 'emotional-test-match-1';
        const testUser2 = 'emotional-test-match-2';
        const testUser3 = 'emotional-test-match-3';

        service.setEmotionalState(testUser1, 'open_to_connect');
        service.setEmotionalState(testUser2, 'need_space');
        service.setEmotionalState(testUser3, 'casual_chat');

        const suggestions = service.suggestMatchesForMood(
          enabledUserId,
          'open_to_connect',
          [testUser1, testUser2, testUser3]
        );

        expect(suggestions.length).toBe(3);
        // First should be highest compatibility
        expect(suggestions[0].userId).toBe(testUser1);
        // Last should be lowest (need_space)
        expect(suggestions[suggestions.length - 1].userId).toBe(testUser2);
      });

      it('should use provided state instead of current state', () => {
        const suggestions = service.suggestMatchesForMood(
          enabledUserId,
          'feeling_adventurous',
          [enabledUserId2]
        );

        expect(suggestions.length).toBe(1);
        expect(suggestions[0].compatibilityScore).toBe(55); // adventurous + deep = 55
      });

      it('should handle matches without emotional state', () => {
        const noStateUser = 'emotional-test-no-state';

        const suggestions = service.suggestMatchesForMood(
          enabledUserId,
          'open_to_connect',
          [noStateUser]
        );

        expect(suggestions.length).toBe(1);
        expect(suggestions[0].emotionalState).toBeNull();
        expect(suggestions[0].compatibilityScore).toBe(50);
      });
    });
  });

  // ===========================================================================
  // History and Patterns Tests
  // ===========================================================================
  describe('History and Patterns', () => {
    describe('getStateHistory', () => {
      it('should return empty array for user without history', () => {
        const history = service.getStateHistory(enabledUserId, 7);
        expect(history).toHaveLength(0);
      });

      it('should return history entries', () => {
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId, 'casual_chat');
        service.clearEmotionalState(enabledUserId);

        const history = service.getStateHistory(enabledUserId, 7);

        expect(history.length).toBe(2);
        expect(history[0].state).toBe('open_to_connect');
        expect(history[1].state).toBe('casual_chat');
      });

      it('should return empty for disabled user', () => {
        const history = service.getStateHistory(disabledUserId, 7);
        expect(history).toHaveLength(0);
      });

      it('should respect retention settings', () => {
        // Update retention to 1 day
        service.updatePrivacySettings(enabledUserId, { historyRetentionDays: 1 });

        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.clearEmotionalState(enabledUserId);

        // Request 7 days but retention is 1 day
        const history = service.getStateHistory(enabledUserId, 7);

        // Should still return the entry since it was just created
        expect(history.length).toBe(1);
      });
    });

    describe('analyzeEmotionalPatterns', () => {
      it('should return null for disabled user', () => {
        const patterns = service.analyzeEmotionalPatterns(disabledUserId);
        expect(patterns).toBeNull();
      });

      it('should return empty patterns for user without history', () => {
        const patterns = service.analyzeEmotionalPatterns(enabledUserId);

        expect(patterns).not.toBeNull();
        expect(patterns?.mostFrequentState).toBeNull();
        expect(patterns?.totalStateChanges).toBe(0);
        expect(patterns?.averageDuration).toBe(0);
      });

      it('should calculate most frequent state', () => {
        // Set multiple states
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId, 'casual_chat');
        service.clearEmotionalState(enabledUserId);

        const patterns = service.analyzeEmotionalPatterns(enabledUserId);

        expect(patterns?.mostFrequentState).toBe('open_to_connect');
        expect(patterns?.totalStateChanges).toBe(3);
      });

      it('should calculate state distribution', () => {
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId, 'casual_chat');
        service.setEmotionalState(enabledUserId, 'casual_chat');
        service.clearEmotionalState(enabledUserId);

        const patterns = service.analyzeEmotionalPatterns(enabledUserId);

        expect(patterns?.stateDistribution.get('open_to_connect')).toBe(1);
        expect(patterns?.stateDistribution.get('casual_chat')).toBe(2);
      });
    });
  });

  // ===========================================================================
  // Privacy Controls Tests
  // ===========================================================================
  describe('Privacy Controls', () => {
    describe('updatePrivacySettings', () => {
      it('should update privacy settings', () => {
        const settings = service.updatePrivacySettings(enabledUserId, {
          visibility: 'public',
          anonymousMode: true,
        });

        expect(settings?.visibility).toBe('public');
        expect(settings?.anonymousMode).toBe(true);
      });

      it('should return null for disabled user', () => {
        const settings = service.updatePrivacySettings(disabledUserId, {
          visibility: 'public',
        });
        expect(settings).toBeNull();
      });
    });

    describe('canViewEmotionalState', () => {
      beforeEach(() => {
        service.setEmotionalState(enabledUserId, 'open_to_connect');
      });

      it('should allow viewing with public visibility', () => {
        service.updatePrivacySettings(enabledUserId, { visibility: 'public' });

        const canView = service.canViewEmotionalState(enabledUserId2, enabledUserId, false);
        expect(canView).toBe(true);
      });

      it('should allow matches to view with matches_only visibility', () => {
        service.updatePrivacySettings(enabledUserId, { visibility: 'matches_only' });

        const canViewAsMatch = service.canViewEmotionalState(enabledUserId2, enabledUserId, true);
        const canViewAsNonMatch = service.canViewEmotionalState(enabledUserId2, enabledUserId, false);

        expect(canViewAsMatch).toBe(true);
        expect(canViewAsNonMatch).toBe(false);
      });

      it('should block all viewing with hidden visibility', () => {
        service.updatePrivacySettings(enabledUserId, { visibility: 'hidden' });

        const canViewAsOther = service.canViewEmotionalState(enabledUserId2, enabledUserId, true);
        const canViewAsSelf = service.canViewEmotionalState(enabledUserId, enabledUserId, true);

        expect(canViewAsOther).toBe(false);
        expect(canViewAsSelf).toBe(true);
      });

      it('should block all viewing in anonymous mode', () => {
        service.enableAnonymousMode(enabledUserId);

        const canView = service.canViewEmotionalState(enabledUserId2, enabledUserId, true);
        expect(canView).toBe(false);
      });
    });

    describe('getEmotionalStateForViewer', () => {
      beforeEach(() => {
        service.setEmotionalState(enabledUserId, 'seeking_comfort');
      });

      it('should return state when viewer has permission', () => {
        service.updatePrivacySettings(enabledUserId, { visibility: 'public' });

        const state = service.getEmotionalStateForViewer(enabledUserId2, enabledUserId, false);

        expect(state).not.toBeNull();
        expect(state?.state).toBe('seeking_comfort');
      });

      it('should return null when viewer lacks permission', () => {
        service.updatePrivacySettings(enabledUserId, { visibility: 'matches_only' });

        const state = service.getEmotionalStateForViewer(enabledUserId2, enabledUserId, false);
        expect(state).toBeNull();
      });
    });

    describe('Anonymous Mode', () => {
      it('should enable anonymous mode', () => {
        service.enableAnonymousMode(enabledUserId);

        const profile = service.getEmotionalProfile(enabledUserId);
        expect(profile?.privacySettings.anonymousMode).toBe(true);
      });

      it('should disable anonymous mode', () => {
        service.enableAnonymousMode(enabledUserId);
        service.disableAnonymousMode(enabledUserId);

        const profile = service.getEmotionalProfile(enabledUserId);
        expect(profile?.privacySettings.anonymousMode).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Preferences Tests
  // ===========================================================================
  describe('Preferences', () => {
    describe('updatePreferences', () => {
      it('should update preferences', () => {
        const preferences = service.updatePreferences(enabledUserId, {
          defaultDuration: 180,
          notifyOnCompatibleMatch: false,
          preferredStates: ['open_to_connect', 'feeling_adventurous'],
        });

        expect(preferences?.defaultDuration).toBe(180);
        expect(preferences?.notifyOnCompatibleMatch).toBe(false);
        expect(preferences?.preferredStates).toContain('open_to_connect');
      });

      it('should return null for disabled user', () => {
        const preferences = service.updatePreferences(disabledUserId, {
          defaultDuration: 60,
        });
        expect(preferences).toBeNull();
      });
    });
  });

  // ===========================================================================
  // Auto-Expiration Tests
  // ===========================================================================
  describe('Auto-Expiration', () => {
    describe('autoExpireStates', () => {
      it('should expire states that have passed their end time', () => {
        // Set state with positive duration so autoExpire is true
        service.setEmotionalState(enabledUserId, 'open_to_connect', 1);

        // Manually adjust end time to the past
        const profile = service.getEmotionalProfile(enabledUserId);
        if (profile?.currentState) {
          profile.currentState.endTime = new Date(Date.now() - 1000);
        }

        const expiredCount = service.autoExpireStates();

        expect(expiredCount).toBe(1);
        expect(service.getEmotionalState(enabledUserId)).toBeNull();
      });

      it('should not expire states without end time', () => {
        service.setEmotionalState(enabledUserId, 'open_to_connect'); // No duration

        const expiredCount = service.autoExpireStates();

        expect(expiredCount).toBe(0);
        expect(service.getEmotionalState(enabledUserId)).not.toBeNull();
      });

      it('should archive expired states to history', () => {
        // Use positive duration so autoExpire is true
        service.setEmotionalState(enabledUserId, 'casual_chat', 1);

        // Manually adjust end time to the past
        const profile = service.getEmotionalProfile(enabledUserId);
        if (profile?.currentState) {
          profile.currentState.endTime = new Date(Date.now() - 1000);
        }

        service.autoExpireStates();

        const history = service.getStateHistory(enabledUserId, 1);
        expect(history.length).toBeGreaterThan(0);
        expect(history[history.length - 1].state).toBe('casual_chat');
      });
    });

    describe('cleanupHistory', () => {
      it('should remove old history entries', () => {
        // Set retention to 1 day for testing
        service.updatePrivacySettings(enabledUserId, { historyRetentionDays: 1 });

        // Create some history
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.clearEmotionalState(enabledUserId);

        // Manually set ALL history entry timestamps to 2 days ago (older than retention)
        const profile = service.getEmotionalProfile(enabledUserId);
        if (profile) {
          const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
          profile.stateHistory.forEach((entry) => {
            entry.startTime = twoDaysAgo;
          });
        }

        // Cleanup should remove entries older than 1 day retention
        service.cleanupHistory();

        const history = service.getStateHistory(enabledUserId, 30);
        // All history entries were older than retention, so should be removed
        expect(history.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================
  describe('Integration', () => {
    it('should handle full user flow', () => {
      // 1. Check feature availability
      expect(service.isFeatureAvailable(enabledUserId)).toBe(true);

      // 2. Get initial profile
      const initialProfile = service.getEmotionalProfile(enabledUserId);
      expect(initialProfile?.currentState).toBeNull();

      // 3. Set emotional state
      service.setEmotionalState(enabledUserId, 'open_to_connect', 120);
      expect(service.getEmotionalState(enabledUserId)?.state).toBe('open_to_connect');

      // 4. Update privacy settings
      service.updatePrivacySettings(enabledUserId, { visibility: 'public' });

      // 5. Another user checks compatibility
      service.setEmotionalState(enabledUserId2, 'feeling_adventurous');
      const compatibility = service.calculateEmotionalCompatibility(
        'open_to_connect',
        'feeling_adventurous'
      );
      expect(compatibility.compatibilityLevel).toBe('high');

      // 6. Get match suggestions
      const suggestions = service.suggestMatchesForMood(enabledUserId, undefined, [
        enabledUserId2,
      ]);
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].compatibilityScore).toBe(90);

      // 7. Change state
      service.setEmotionalState(enabledUserId, 'need_space');

      // 8. Check history
      const history = service.getStateHistory(enabledUserId, 7);
      expect(history.length).toBe(1);
      expect(history[0].state).toBe('open_to_connect');

      // 9. Analyze patterns
      const patterns = service.analyzeEmotionalPatterns(enabledUserId);
      expect(patterns?.totalStateChanges).toBe(1);
    });

    it('should handle multiple users independently', () => {
      service.setEmotionalState(enabledUserId, 'open_to_connect');
      service.setEmotionalState(enabledUserId2, 'need_space');

      expect(service.getEmotionalState(enabledUserId)?.state).toBe('open_to_connect');
      expect(service.getEmotionalState(enabledUserId2)?.state).toBe('need_space');

      // Privacy settings should be independent
      service.enableAnonymousMode(enabledUserId);

      const profile1 = service.getEmotionalProfile(enabledUserId);
      const profile2 = service.getEmotionalProfile(enabledUserId2);

      expect(profile1?.privacySettings.anonymousMode).toBe(true);
      expect(profile2?.privacySettings.anonymousMode).toBe(false);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      for (let i = 0; i < 10; i++) {
        service.setEmotionalState(enabledUserId, 'open_to_connect');
        service.setEmotionalState(enabledUserId, 'casual_chat');
      }

      const profile = service.getEmotionalProfile(enabledUserId);
      // Should have 19 history entries (last state is current)
      expect(profile?.stateHistory.length).toBe(19);
      expect(profile?.currentState?.state).toBe('casual_chat');
    });

    it('should handle empty potential matches array', () => {
      service.setEmotionalState(enabledUserId, 'open_to_connect');

      const suggestions = service.suggestMatchesForMood(enabledUserId, undefined, []);
      expect(suggestions).toHaveLength(0);
    });

    it('should handle user setting same state multiple times', () => {
      service.setEmotionalState(enabledUserId, 'open_to_connect');
      service.setEmotionalState(enabledUserId, 'open_to_connect');
      service.setEmotionalState(enabledUserId, 'open_to_connect');

      const profile = service.getEmotionalProfile(enabledUserId);
      // Each set creates a new state, archiving the previous
      expect(profile?.stateHistory.length).toBe(2);
    });

    it('should handle clearing state when no state exists', () => {
      // Should not throw
      expect(() => {
        service.clearEmotionalState(enabledUserId);
      }).not.toThrow();

      const state = service.getEmotionalState(enabledUserId);
      expect(state).toBeNull();
    });
  });
});
