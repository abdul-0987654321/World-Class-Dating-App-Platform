import { SubscriptionFeature } from '../entities/SubscriptionFeature.entity';
import db from '../../infrastructure/database/connection';

export class SubscriptionFeatureRepository {
  private tableName = 'subscription_features';

  async findByTier(tier: string): Promise<SubscriptionFeature[]> {
    const features = await db(this.tableName)
      .where({ tier, active: true })
      .orderBy('feature_key', 'asc')
      .select('*');

    return features.map(this.mapToEntity);
  }

  async findByFeatureKey(featureKey: string): Promise<SubscriptionFeature[]> {
    const features = await db(this.tableName)
      .where({ feature_key: featureKey, active: true })
      .orderBy('tier', 'asc')
      .select('*');

    return features.map(this.mapToEntity);
  }

  async findByTierAndFeature(tier: string, featureKey: string): Promise<SubscriptionFeature | null> {
    const feature = await db(this.tableName)
      .where({ tier, feature_key: featureKey, active: true })
      .first();

    return feature ? this.mapToEntity(feature) : null;
  }

  async findAllActive(): Promise<SubscriptionFeature[]> {
    const features = await db(this.tableName)
      .where({ active: true })
      .orderBy('tier', 'asc')
      .orderBy('feature_key', 'asc')
      .select('*');

    return features.map(this.mapToEntity);
  }

  async findById(id: string): Promise<SubscriptionFeature | null> {
    const feature = await db(this.tableName)
      .where({ id })
      .first();

    return feature ? this.mapToEntity(feature) : null;
  }

  async updateFeatureValue(id: string, featureValue: Record<string, any>): Promise<SubscriptionFeature> {
    const [feature] = await db(this.tableName)
      .where({ id })
      .update({
        feature_value: JSON.stringify(featureValue),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(feature);
  }

  async toggleFeature(id: string, active: boolean): Promise<SubscriptionFeature> {
    const [feature] = await db(this.tableName)
      .where({ id })
      .update({
        active,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(feature);
  }

  // Get all features grouped by tier
  async findAllGroupedByTier(): Promise<Record<string, SubscriptionFeature[]>> {
    const features = await this.findAllActive();

    return features.reduce((acc, feature) => {
      if (!acc[feature.tier]) {
        acc[feature.tier] = [];
      }
      acc[feature.tier].push(feature);
      return acc;
    }, {} as Record<string, SubscriptionFeature[]>);
  }

  // Map database row to entity
  private mapToEntity(row: any): SubscriptionFeature {
    return {
      id: row.id,
      tier: row.tier,
      featureKey: row.feature_key,
      featureValue: typeof row.feature_value === 'string'
        ? JSON.parse(row.feature_value)
        : row.feature_value,
      description: row.description,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new SubscriptionFeatureRepository();
