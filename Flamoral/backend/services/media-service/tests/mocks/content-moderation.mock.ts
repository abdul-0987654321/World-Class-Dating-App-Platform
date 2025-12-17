/**
 * Mock for Content Moderation Service
 */

import { ModerationStatus } from '../../src/types';

export const mockContentModerationService = {
  moderateImage: jest.fn().mockResolvedValue({
    status: ModerationStatus.APPROVED,
    result: {
      isAdultContent: false,
      isRacyContent: false,
      isViolentContent: false,
      adultScore: 0.1,
      racyScore: 0.1,
      violenceScore: 0.1,
    },
  }),

  verifyFacePresence: jest.fn().mockResolvedValue(true),
};

// Mock the module
jest.mock('../../src/domain/services/content-moderation.service', () => ({
  __esModule: true,
  default: mockContentModerationService,
}));
