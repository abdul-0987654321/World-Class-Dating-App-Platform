/**
 * Unit tests for Recommendation Service
 * Tests recommendation generation, scoring, and top matches
 */

import { RecommendationService } from '../../../src/domain/services/recommendation.service';
import swipeRepository from '../../../src/domain/repositories/swipe.repository';
import matchRepository from '../../../src/domain/repositories/match.repository';
import matchingAlgorithm from '../../../src/domain/services/matching-algorithm.service';
import axios from 'axios';

jest.mock('../../../src/domain/repositories/swipe.repository');
jest.mock('../../../src/domain/repositories/match.repository');
jest.mock('../../../src/domain/services/matching-algorithm.service');
jest.mock('axios');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  ServiceClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    recommendationService = new RecommendationService();
  });

  describe('getRecommendations', () => {
    const mockCurrentUser = {
      userId,
      age: 28,
      gender: 'male',
      location: { latitude: 40.7128, longitude: -74.006 },
      interests: ['music', 'travel'],
    };

    const mockPreferences = {
      ageMin: 22,
      ageMax: 35,
      maxDistance: 50,
      genderPreference: ['female'],
    };

    const mockCandidates = [
      { userId: 'candidate-1', age: 25, gender: 'female' },
      { userId: 'candidate-2', age: 27, gender: 'female' },
      { userId: 'candidate-3', age: 30, gender: 'female' },
    ];

    const mockScores = [
      { userId: 'candidate-1', score: 85, factors: {} },
      { userId: 'candidate-2', score: 75, factors: {} },
      { userId: 'candidate-3', score: 65, factors: {} },
    ];

    it('should return personalized recommendations', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue(['swiped-1', 'swiped-2']);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([
        { getOtherUserId: () => 'matched-1' },
      ]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      const result = await recommendationService.getRecommendations({
        userId,
        limit: 20,
      });

      expect(result).toEqual(mockScores);
      expect(swipeRepository.getSwipedUserIds).toHaveBeenCalledWith(userId);
      expect(matchRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(matchingAlgorithm.calculateBatchScores).toHaveBeenCalled();
    });

    it('should exclude already swiped users', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const swipedUserIds = ['candidate-1', 'candidate-2'];
      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue(swipedUserIds);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      await recommendationService.getRecommendations({ userId });

      // Verify search was called with excluded user IDs
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          excludedUserIds: expect.arrayContaining([...swipedUserIds, userId]),
        })
      );
    });

    it('should exclude already matched users', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const matchedUsers = [
        { getOtherUserId: () => 'matched-1' },
        { getOtherUserId: () => 'matched-2' },
      ];
      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue(matchedUsers);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      await recommendationService.getRecommendations({ userId });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          excludedUserIds: expect.arrayContaining(['matched-1', 'matched-2', userId]),
        })
      );
    });

    it('should return empty array when no candidates found', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await recommendationService.getRecommendations({ userId });

      expect(result).toEqual([]);
      expect(matchingAlgorithm.calculateBatchScores).not.toHaveBeenCalled();
    });

    it('should filter out low score recommendations (below 30)', async () => {
      const scoresWithLow = [
        { userId: 'candidate-1', score: 85, factors: {} },
        { userId: 'candidate-2', score: 25, factors: {} }, // Below threshold
        { userId: 'candidate-3', score: 10, factors: {} }, // Below threshold
      ];

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(scoresWithLow);

      const result = await recommendationService.getRecommendations({ userId });

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe('candidate-1');
    });

    it('should apply pagination with offset and limit', async () => {
      const manyScores = Array.from({ length: 50 }, (_, i) => ({
        userId: `candidate-${i}`,
        score: 90 - i,
        factors: {},
      }));

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(manyScores);

      const result = await recommendationService.getRecommendations({
        userId,
        limit: 10,
        offset: 5,
      });

      expect(result.length).toBe(10);
      expect(result[0].userId).toBe('candidate-5');
      expect(result[9].userId).toBe('candidate-14');
    });

    it('should use default preferences if fetch fails', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      const result = await recommendationService.getRecommendations({ userId });

      expect(result).toEqual(mockScores);
      // Should have used default preferences (age 18-99, distance 50km)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          ageMin: 18,
          ageMax: 99,
          maxDistance: 50,
        })
      );
    });

    it('should apply additional filters from request', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: mockCandidates });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      await recommendationService.getRecommendations({
        userId,
        filters: { ageMin: 25, ageMax: 30 },
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          ageMin: 25,
          ageMax: 30,
        })
      );
    });

    it('should throw error when user profile fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('User not found'));

      await expect(recommendationService.getRecommendations({ userId })).rejects.toThrow(
        'Failed to fetch user profile'
      );
    });

    it('should return empty array if candidate service is unavailable', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({ data: mockPreferences });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.reject(new Error('Service unavailable'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await recommendationService.getRecommendations({ userId });

      expect(result).toEqual([]);
    });
  });

  describe('getTopMatches', () => {
    const mockScores = [
      { userId: 'candidate-1', score: 95, factors: {} },
      { userId: 'candidate-2', score: 90, factors: {} },
      { userId: 'candidate-3', score: 85, factors: {} },
      { userId: 'candidate-4', score: 80, factors: {} },
      { userId: 'candidate-5', score: 75, factors: {} },
    ];

    it('should return top N matches by score', async () => {
      const mockCurrentUser = {
        userId,
        age: 28,
        gender: 'male',
        location: { latitude: 40.7128, longitude: -74.006 },
      };

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({
            data: { ageMin: 22, ageMax: 35, maxDistance: 50, genderPreference: ['female'] },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: [{ userId: 'candidate-1' }] });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(mockScores);

      const result = await recommendationService.getTopMatches(userId, 3);

      expect(result.length).toBe(3);
      expect(result[0].score).toBe(95);
      expect(result[1].score).toBe(90);
      expect(result[2].score).toBe(85);
    });

    it('should use default limit of 10', async () => {
      const mockCurrentUser = {
        userId,
        age: 28,
        gender: 'male',
        location: { latitude: 40.7128, longitude: -74.006 },
      };

      const manyScores = Array.from({ length: 20 }, (_, i) => ({
        userId: `candidate-${i}`,
        score: 100 - i,
        factors: {},
      }));

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({
            data: { ageMin: 22, ageMax: 35, maxDistance: 50, genderPreference: ['female'] },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: [{ userId: 'candidate-1' }] });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(manyScores);

      const result = await recommendationService.getTopMatches(userId);

      expect(result.length).toBe(10);
    });

    it('should return all results if fewer than limit', async () => {
      const mockCurrentUser = {
        userId,
        age: 28,
        gender: 'male',
        location: { latitude: 40.7128, longitude: -74.006 },
      };

      const fewScores = [
        { userId: 'candidate-1', score: 95, factors: {} },
        { userId: 'candidate-2', score: 90, factors: {} },
      ];

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/profile')) {
          return Promise.resolve({ data: mockCurrentUser });
        }
        if (url.includes('/preferences')) {
          return Promise.resolve({
            data: { ageMin: 22, ageMax: 35, maxDistance: 50, genderPreference: ['female'] },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/search')) {
          return Promise.resolve({ data: [{ userId: 'candidate-1' }] });
        }
        if (url.includes('/preferences/batch')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      (swipeRepository.getSwipedUserIds as jest.Mock).mockResolvedValue([]);
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (matchingAlgorithm.calculateBatchScores as jest.Mock).mockResolvedValue(fewScores);

      const result = await recommendationService.getTopMatches(userId, 10);

      expect(result.length).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(recommendationService.getTopMatches(userId)).rejects.toThrow();
    });
  });

  describe('refreshRecommendations', () => {
    it('should complete without error', async () => {
      await expect(recommendationService.refreshRecommendations(userId)).resolves.not.toThrow();
    });
  });
});
