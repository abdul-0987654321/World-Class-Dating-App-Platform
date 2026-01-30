import { v4 as uuidv4 } from 'uuid';

import { db } from '../infrastructure/database';
import { ABTest } from '../types';
import { logger } from '../utils/logger';

export class ABTestService {
  async listTests(filters: {
    status?: 'draft' | 'running' | 'paused' | 'completed';
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db('ab_tests').select('*');

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    const [tests, [{ count }]] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().count('* as count'),
    ]);

    return {
      tests: tests.map(this.formatTest),
      total: parseInt(count as string, 10),
      page,
      limit,
    };
  }

  async getTest(testId: string): Promise<ABTest> {
    const test = await db('ab_tests').where({ id: testId }).first();

    if (!test) {
      throw new Error('A/B test not found');
    }

    return this.formatTest(test);
  }

  async createTest(data: {
    name: string;
    description: string;
    variants: Array<{
      name: string;
      description: string;
      allocation: number;
    }>;
    metrics: {
      primaryMetric: string;
      secondaryMetrics: string[];
    };
    createdBy: string;
  }): Promise<ABTest> {
    const testId = uuidv4();

    // Validate allocations sum to 100
    const totalAllocation = data.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Variant allocations must sum to 100%');
    }

    const test = {
      id: testId,
      name: data.name,
      description: data.description,
      status: 'draft',
      variants: JSON.stringify(
        data.variants.map((v) => ({
          id: uuidv4(),
          ...v,
          users: 0,
          conversions: 0,
        }))
      ),
      metrics: JSON.stringify(data.metrics),
      created_by: data.createdBy,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    await db('ab_tests').insert(test);

    logger.info(`A/B test created: ${testId}`, { name: data.name });

    return this.formatTest(test);
  }

  async updateTest(testId: string, updates: Partial<ABTest>): Promise<ABTest> {
    await db('ab_tests')
      .where({ id: testId })
      .update({
        ...updates,
        updated_at: db.fn.now(),
      });

    const test = await db('ab_tests').where({ id: testId }).first();

    logger.info(`A/B test updated: ${testId}`);

    return this.formatTest(test);
  }

  async startTest(testId: string): Promise<void> {
    await db('ab_tests').where({ id: testId }).update({
      status: 'running',
      start_date: db.fn.now(),
      updated_at: db.fn.now(),
    });

    logger.info(`A/B test started: ${testId}`);
  }

  async pauseTest(testId: string): Promise<void> {
    await db('ab_tests').where({ id: testId }).update({
      status: 'paused',
      updated_at: db.fn.now(),
    });

    logger.info(`A/B test paused: ${testId}`);
  }

  async completeTest(
    testId: string,
    results: {
      winner?: string;
      confidence: number;
      summary: string;
    }
  ): Promise<void> {
    await db('ab_tests')
      .where({ id: testId })
      .update({
        status: 'completed',
        end_date: db.fn.now(),
        results: JSON.stringify(results),
        updated_at: db.fn.now(),
      });

    logger.info(`A/B test completed: ${testId}`, { winner: results.winner });
  }

  async deleteTest(testId: string): Promise<void> {
    const test = await db('ab_tests').where({ id: testId }).first();

    if (test.status === 'running') {
      throw new Error('Cannot delete a running test. Pause it first.');
    }

    await db('ab_tests').where({ id: testId }).delete();

    logger.info(`A/B test deleted: ${testId}`);
  }

  async getTestMetrics(testId: string) {
    // This would fetch actual metrics from analytics service
    // For now, returning placeholder
    const test = await this.getTest(testId);

    return {
      testId,
      metrics: test.variants.map((variant) => ({
        variantId: variant.id,
        variantName: variant.name,
        users: variant.users,
        conversions: variant.conversions,
        conversionRate: variant.users > 0 ? (variant.conversions / variant.users) * 100 : 0,
      })),
    };
  }

  private formatTest(test: any): ABTest {
    return {
      id: test.id,
      name: test.name,
      description: test.description,
      status: test.status,
      startDate: test.start_date,
      endDate: test.end_date,
      variants: JSON.parse(test.variants || '[]'),
      metrics: JSON.parse(test.metrics || '{}'),
      results: test.results ? JSON.parse(test.results) : undefined,
      createdBy: test.created_by,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };
  }
}
