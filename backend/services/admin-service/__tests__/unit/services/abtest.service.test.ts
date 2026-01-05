import { ABTestService } from '../../../src/services/abtest.service';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
      first: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };
  });
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date('2026-01-04T12:00:00.000Z')),
  };
  mockDb.raw = jest.fn();
  return { db: mockDb };
});

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { db } from '../../../src/infrastructure/database';
import { logger } from '../../../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

describe('ABTestService', () => {
  let abTestService: ABTestService;
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    abTestService = new ABTestService();
    jest.clearAllMocks();
  });

  describe('listTests', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return paginated A/B tests with default filters', async () => {
      const mockTests = [
        {
          id: 'test-1',
          name: 'Button Color Test',
          description: 'Testing button colors',
          status: 'running',
          start_date: new Date('2026-01-01'),
          end_date: null,
          variants: JSON.stringify([
            { id: 'v1', name: 'Control', allocation: 50, users: 100, conversions: 10 },
            { id: 'v2', name: 'Variant A', allocation: 50, users: 100, conversions: 15 },
          ]),
          metrics: JSON.stringify({ primaryMetric: 'clicks', secondaryMetrics: ['signups'] }),
          results: null,
          created_by: 'admin-1',
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-04'),
        },
      ];

      mockQueryBuilder.offset.mockResolvedValue(mockTests);
      mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);

      const result = await abTestService.listTests({});

      expect(result.tests).toHaveLength(1);
      expect(result.tests[0]).toEqual(
        expect.objectContaining({
          id: 'test-1',
          name: 'Button Color Test',
          status: 'running',
        })
      );
      expect(result.tests[0].variants).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '0' }]);

      await abTestService.listTests({ status: 'draft' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('status', 'draft');
    });

    it('should apply pagination correctly', async () => {
      mockQueryBuilder.offset.mockResolvedValue([]);
      mockQueryBuilder.count.mockResolvedValue([{ count: '50' }]);

      await abTestService.listTests({ page: 2, limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10); // (2-1) * 10
    });

    it('should handle empty variants and metrics', async () => {
      const mockTests = [
        {
          id: 'test-1',
          name: 'Empty Test',
          description: 'Test',
          status: 'draft',
          variants: null,
          metrics: null,
          created_by: 'admin-1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQueryBuilder.offset.mockResolvedValue(mockTests);
      mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);

      const result = await abTestService.listTests({});

      expect(result.tests[0].variants).toEqual([]);
      expect(result.tests[0].metrics).toEqual({});
    });
  });

  describe('getTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return test by id', async () => {
      const mockTest = {
        id: 'test-1',
        name: 'Test Name',
        description: 'Description',
        status: 'running',
        start_date: new Date('2026-01-01'),
        end_date: null,
        variants: JSON.stringify([
          { id: 'v1', name: 'Control', allocation: 50 },
        ]),
        metrics: JSON.stringify({ primaryMetric: 'conversion' }),
        results: null,
        created_by: 'admin-1',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-04'),
      };

      mockQueryBuilder.first.mockResolvedValue(mockTest);

      const result = await abTestService.getTest('test-1');

      expect(result.id).toBe('test-1');
      expect(result.name).toBe('Test Name');
      expect(result.variants).toEqual([{ id: 'v1', name: 'Control', allocation: 50 }]);
    });

    it('should throw error when test not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(abTestService.getTest('non-existent'))
        .rejects.toThrow('A/B test not found');
    });

    it('should parse results when present', async () => {
      const mockTest = {
        id: 'test-1',
        name: 'Completed Test',
        description: 'Description',
        status: 'completed',
        variants: JSON.stringify([]),
        metrics: JSON.stringify({}),
        results: JSON.stringify({ winner: 'v2', confidence: 0.95, summary: 'V2 wins' }),
        created_by: 'admin-1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQueryBuilder.first.mockResolvedValue(mockTest);

      const result = await abTestService.getTest('test-1');

      expect(result.results).toEqual({
        winner: 'v2',
        confidence: 0.95,
        summary: 'V2 wins',
      });
    });
  });

  describe('createTest', () => {
    const mockQueryBuilder = {
      insert: jest.fn(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('test-uuid')
        .mockReturnValueOnce('variant-1-uuid')
        .mockReturnValueOnce('variant-2-uuid');
    });

    it('should create a new A/B test', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const testData = {
        name: 'New Test',
        description: 'Testing new feature',
        variants: [
          { name: 'Control', description: 'Original', allocation: 50 },
          { name: 'Variant A', description: 'New version', allocation: 50 },
        ],
        metrics: {
          primaryMetric: 'conversion_rate',
          secondaryMetrics: ['bounce_rate'],
        },
        createdBy: 'admin-1',
      };

      const result = await abTestService.createTest(testData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          name: 'New Test',
          status: 'draft',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'A/B test created: test-uuid',
        { name: 'New Test' }
      );
    });

    it('should throw error when allocations do not sum to 100', async () => {
      const testData = {
        name: 'Invalid Test',
        description: 'Invalid allocations',
        variants: [
          { name: 'Control', description: 'Original', allocation: 40 },
          { name: 'Variant A', description: 'New version', allocation: 40 },
        ],
        metrics: {
          primaryMetric: 'conversion',
          secondaryMetrics: [],
        },
        createdBy: 'admin-1',
      };

      await expect(abTestService.createTest(testData))
        .rejects.toThrow('Variant allocations must sum to 100%');
    });

    it('should allow allocations that sum close to 100 (floating point tolerance)', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const testData = {
        name: 'Test',
        description: 'Description',
        variants: [
          { name: 'A', description: 'A', allocation: 33.33 },
          { name: 'B', description: 'B', allocation: 33.33 },
          { name: 'C', description: 'C', allocation: 33.34 },
        ],
        metrics: {
          primaryMetric: 'conversion',
          secondaryMetrics: [],
        },
        createdBy: 'admin-1',
      };

      await expect(abTestService.createTest(testData)).resolves.toBeDefined();
    });

    it('should initialize variant users and conversions to 0', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const testData = {
        name: 'Test',
        description: 'Description',
        variants: [
          { name: 'Control', description: 'Original', allocation: 100 },
        ],
        metrics: {
          primaryMetric: 'clicks',
          secondaryMetrics: [],
        },
        createdBy: 'admin-1',
      };

      await abTestService.createTest(testData);

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      const variants = JSON.parse(insertCall.variants);

      expect(variants[0].users).toBe(0);
      expect(variants[0].conversions).toBe(0);
    });
  });

  describe('updateTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should update test fields', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.first.mockResolvedValue({
        id: 'test-1',
        name: 'Updated Name',
        description: 'Updated description',
        status: 'draft',
        variants: JSON.stringify([]),
        metrics: JSON.stringify({}),
        created_by: 'admin-1',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await abTestService.updateTest('test-1', {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('A/B test updated: test-1');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('startTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should start a test', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await abTestService.startTest('test-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
        })
      );
      expect(logger.info).toHaveBeenCalledWith('A/B test started: test-1');
    });

    it('should set start_date when starting', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await abTestService.startTest('test-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: expect.anything(),
        })
      );
    });
  });

  describe('pauseTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should pause a test', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await abTestService.pauseTest('test-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paused',
        })
      );
      expect(logger.info).toHaveBeenCalledWith('A/B test paused: test-1');
    });
  });

  describe('completeTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should complete a test with results', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const results = {
        winner: 'variant-a',
        confidence: 0.95,
        summary: 'Variant A showed 15% improvement in conversion rate',
      };

      await abTestService.completeTest('test-1', results);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          results: JSON.stringify(results),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'A/B test completed: test-1',
        { winner: 'variant-a' }
      );
    });

    it('should set end_date when completing', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await abTestService.completeTest('test-1', {
        confidence: 0.9,
        summary: 'Inconclusive',
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          end_date: expect.anything(),
        })
      );
    });

    it('should handle completion without winner', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await abTestService.completeTest('test-1', {
        confidence: 0.5,
        summary: 'No significant difference',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'A/B test completed: test-1',
        { winner: undefined }
      );
    });
  });

  describe('deleteTest', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      delete: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should delete a draft test', async () => {
      mockQueryBuilder.first.mockResolvedValue({ status: 'draft' });
      mockQueryBuilder.delete.mockResolvedValue(1);

      await abTestService.deleteTest('test-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('A/B test deleted: test-1');
    });

    it('should delete a paused test', async () => {
      mockQueryBuilder.first.mockResolvedValue({ status: 'paused' });
      mockQueryBuilder.delete.mockResolvedValue(1);

      await abTestService.deleteTest('test-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should delete a completed test', async () => {
      mockQueryBuilder.first.mockResolvedValue({ status: 'completed' });
      mockQueryBuilder.delete.mockResolvedValue(1);

      await abTestService.deleteTest('test-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should throw error when trying to delete running test', async () => {
      mockQueryBuilder.first.mockResolvedValue({ status: 'running' });

      await expect(abTestService.deleteTest('test-1'))
        .rejects.toThrow('Cannot delete a running test. Pause it first.');
    });
  });

  describe('getTestMetrics', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return test metrics with conversion rates', async () => {
      mockQueryBuilder.first.mockResolvedValue({
        id: 'test-1',
        name: 'Test',
        description: 'Description',
        status: 'running',
        variants: JSON.stringify([
          { id: 'v1', name: 'Control', allocation: 50, users: 100, conversions: 10 },
          { id: 'v2', name: 'Variant A', allocation: 50, users: 100, conversions: 15 },
        ]),
        metrics: JSON.stringify({}),
        created_by: 'admin-1',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await abTestService.getTestMetrics('test-1');

      expect(result.testId).toBe('test-1');
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0]).toEqual({
        variantId: 'v1',
        variantName: 'Control',
        users: 100,
        conversions: 10,
        conversionRate: 10, // (10/100) * 100
      });
      expect(result.metrics[1].conversionRate).toBe(15);
    });

    it('should handle zero users (avoid division by zero)', async () => {
      mockQueryBuilder.first.mockResolvedValue({
        id: 'test-1',
        name: 'Test',
        description: 'Description',
        status: 'draft',
        variants: JSON.stringify([
          { id: 'v1', name: 'Control', allocation: 100, users: 0, conversions: 0 },
        ]),
        metrics: JSON.stringify({}),
        created_by: 'admin-1',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await abTestService.getTestMetrics('test-1');

      expect(result.metrics[0].conversionRate).toBe(0);
    });
  });
});
