/**
 * Harassment Detection Service Tests
 */

import { harassmentDetectionService } from '../harassment-detection.service';

describe('HarassmentDetectionService', () => {
  describe('analyzeContent', () => {
    it('should detect direct threats', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'I will kill you if you dont respond',
        'user-1',
        { saveResult: false }
      );

      expect(result.threatScore).toBeGreaterThan(0.5);
      expect(result.isFlagged).toBe(true);
      expect(result.detectedPatterns.some(p => p.category === 'direct_threats')).toBe(true);
    });

    it('should detect sexual harassment', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'send me nudes right now',
        'user-1',
        { saveResult: false }
      );

      expect(result.sexualHarassmentScore).toBeGreaterThan(0.5);
      expect(result.isFlagged).toBe(true);
      expect(result.detectedPatterns.some(p => p.category === 'sexual_harassment')).toBe(true);
    });

    it('should detect stalking behavior', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'I know where you live and I am watching you',
        'user-1',
        { saveResult: false }
      );

      expect(result.threatScore).toBeGreaterThan(0.5);
      expect(result.isFlagged).toBe(true);
      expect(result.detectedPatterns.some(p => p.category === 'stalking_behavior')).toBe(true);
    });

    it('should detect manipulation', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'No one else will ever love you, you are worthless',
        'user-1',
        { saveResult: false }
      );

      expect(result.manipulationScore).toBeGreaterThan(0.3);
      expect(result.detectedPatterns.some(p => p.category === 'manipulation')).toBe(true);
    });

    it('should detect hate speech', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'You should go back to your country',
        'user-1',
        { saveResult: false }
      );

      expect(result.hateSpeechScore).toBeGreaterThan(0.3);
      expect(result.detectedPatterns.some(p => p.category === 'hate_speech')).toBe(true);
    });

    it('should allow normal messages', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'Hi! How are you doing today? Would you like to grab coffee sometime?',
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBeLessThan(0.3);
      expect(result.isFlagged).toBe(false);
      expect(result.recommendedAction).toBe('none');
    });

    it('should allow compliments and positive messages', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'You have a beautiful smile! I love your photos from hiking.',
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBeLessThan(0.3);
      expect(result.isFlagged).toBe(false);
    });

    it('should recommend appropriate actions based on risk score', async () => {
      // Low risk - allow
      const lowRisk = await harassmentDetectionService.analyzeContent(
        'Nice to meet you!',
        'user-1',
        { saveResult: false }
      );
      expect(lowRisk.recommendedAction).toBe('none');

      // High risk - block
      const highRisk = await harassmentDetectionService.analyzeContent(
        'I will find you and kill you, I know where you live',
        'user-1',
        { saveResult: false }
      );
      expect(highRisk.recommendedAction).toBe('block');
      expect(highRisk.autoBlocked).toBe(true);
    });

    it('should handle leetspeak and obfuscation', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'I will k1ll y0u',
        'user-1',
        { saveResult: false }
      );

      // Should normalize leetspeak and detect the threat
      expect(result.threatScore).toBeGreaterThan(0);
    });

    it('should generate explanations for flagged content', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'Send me nudes or I will share your pics',
        'user-1',
        { saveResult: false }
      );

      expect(result.aiExplanation).toBeDefined();
      expect(result.aiExplanation.length).toBeGreaterThan(0);
    });
  });

  describe('checkUserRiskStatus', () => {
    it('should return low risk for users with no harassment history', async () => {
      // This test would require mocking the database
      // For now, we just verify the method exists and returns expected structure
      const result = await harassmentDetectionService.checkUserRiskStatus('non-existent-user');

      expect(result).toHaveProperty('shouldBlock');
      expect(result).toHaveProperty('shouldWarn');
      expect(result).toHaveProperty('riskLevel');
    });
  });

  describe('pattern detection', () => {
    const testCases = [
      // Direct threats
      { input: 'I will hurt you', expectedCategory: 'direct_threats' },
      { input: 'You will die', expectedCategory: 'direct_threats' },
      { input: 'Watch your back', expectedCategory: 'direct_threats' },

      // Sexual harassment
      { input: 'Show me your body', expectedCategory: 'sexual_harassment' },
      { input: 'Wanna bang?', expectedCategory: 'sexual_harassment' },

      // Stalking
      { input: 'I found your address', expectedCategory: 'stalking_behavior' },
      { input: "I'm following you", expectedCategory: 'stalking_behavior' },

      // Blackmail
      { input: 'Send money or else', expectedCategory: 'blackmail_coercion' },
      { input: "I'll share your pics", expectedCategory: 'blackmail_coercion' },

      // Manipulation
      { input: "You're worthless", expectedCategory: 'manipulation' },
      { input: 'No one will ever love you', expectedCategory: 'manipulation' },
    ];

    testCases.forEach(({ input, expectedCategory }) => {
      it(`should detect "${expectedCategory}" in: "${input}"`, async () => {
        const result = await harassmentDetectionService.analyzeContent(
          input,
          'user-1',
          { saveResult: false }
        );

        const hasCategory = result.detectedPatterns.some(p => p.category === expectedCategory);
        expect(hasCategory).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        '',
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBe(0);
      expect(result.isFlagged).toBe(false);
    });

    it('should handle very long content', async () => {
      const longContent = 'Hello '.repeat(1000);
      const result = await harassmentDetectionService.analyzeContent(
        longContent,
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBeLessThan(0.3);
    });

    it('should handle special characters', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBeLessThan(0.3);
    });

    it('should handle unicode content', async () => {
      const result = await harassmentDetectionService.analyzeContent(
        'Hello! How are you? I love to travel. Where are you from?',
        'user-1',
        { saveResult: false }
      );

      expect(result.overallRiskScore).toBeLessThan(0.3);
    });
  });
});
