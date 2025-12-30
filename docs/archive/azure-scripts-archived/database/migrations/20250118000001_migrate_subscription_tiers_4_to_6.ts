import { Knex } from 'knex';

/**
 * Migration: Transition from 4-tier to 6-tier subscription system
 *
 * This migration handles the transition from the old 4-tier system:
 *   - free, basic, mid, ultra
 *
 * To the new 6-tier system:
 *   - free, basic, plus, premium, premium_plus, elite
 *
 * Mapping strategy:
 *   - free -> free (no change)
 *   - basic -> basic (no change)
 *   - mid -> premium (mid-tier users get upgraded to premium)
 *   - ultra -> elite (top-tier users get upgraded to elite)
 *   - plus (new tier, inserted between basic and premium)
 *   - premium_plus (new tier, inserted between premium and elite)
 */

export async function up(knex: Knex): Promise<void> {
  console.log('Starting subscription tier migration: 4-tier to 6-tier system...');

  // Step 1: Check if we need to migrate subscription_plans table
  const hasSubscriptionPlans = await knex.schema.hasTable('subscription_plans');

  if (hasSubscriptionPlans) {
    console.log('Migrating subscription_plans table...');

    // Update the tier enum to include new tiers
    // For PostgreSQL
    await knex.raw(`
      ALTER TABLE subscription_plans
      DROP CONSTRAINT IF EXISTS subscription_plans_tier_check
    `);

    // Update existing tiers: mid -> premium, ultra -> elite
    await knex('subscription_plans')
      .where('tier', 'mid')
      .update({ tier: 'premium', name: 'premium' });

    await knex('subscription_plans')
      .where('tier', 'ultra')
      .update({ tier: 'elite', name: 'elite' });

    // Add new constraint with all 6 tiers
    await knex.raw(`
      ALTER TABLE subscription_plans
      ADD CONSTRAINT subscription_plans_tier_check
      CHECK (tier IN ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'))
    `);

    // Insert new tier plans if they don't exist
    const existingPlans = await knex('subscription_plans').select('tier');
    const existingTiers = existingPlans.map(p => p.tier);

    if (!existingTiers.includes('plus')) {
      await knex('subscription_plans').insert({
        name: 'plus',
        tier: 'plus',
        display_name: 'Plus',
        description: 'Enhanced visibility and privacy features',
        price_monthly: 14.99,
        price_yearly: 143.88,
        price_3_months: 40.47,
        price_6_months: 71.94,
        features: JSON.stringify([
          'Everything in Basic',
          '10 super likes per day',
          'Incognito mode',
          'Priority likes',
          'Read receipts',
          '1 free boost per month'
        ]),
        daily_swipes: 999999,
        daily_super_likes: 10,
        monthly_boosts: 1,
        unlimited_likes: true,
        see_who_likes_you: true,
        rewind_enabled: true,
        incognito_mode: true,
        passport_enabled: false,
        priority_likes: true,
        read_receipts: true,
        advanced_filters: false,
        unlimited_rewinds: false,
        sort_order: 2,
      });
    }

    if (!existingTiers.includes('premium_plus')) {
      await knex('subscription_plans').insert({
        name: 'premium_plus',
        tier: 'premium_plus',
        display_name: 'Premium+',
        description: 'Power user features with message before match',
        price_monthly: 29.99,
        price_yearly: 287.88,
        price_3_months: 80.97,
        price_6_months: 143.94,
        features: JSON.stringify([
          'Everything in Premium',
          'Message before matching',
          '1 weekly boost',
          'Unlimited rewinds',
          'See who viewed your profile',
          'Priority customer support'
        ]),
        daily_swipes: 999999,
        daily_super_likes: 999999,
        monthly_boosts: 4,
        unlimited_likes: true,
        see_who_likes_you: true,
        rewind_enabled: true,
        incognito_mode: true,
        passport_enabled: true,
        priority_likes: true,
        read_receipts: true,
        advanced_filters: true,
        unlimited_rewinds: true,
        sort_order: 4,
      });
    }
  }

  // Step 2: Migrate subscriptions table (user subscriptions)
  const hasSubscriptions = await knex.schema.hasTable('subscriptions');

  if (hasSubscriptions) {
    console.log('Migrating subscriptions table...');

    // Update the tier enum
    await knex.raw(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_tier_check
    `);

    // Update existing user subscriptions: mid -> premium, ultra -> elite
    const midCount = await knex('subscriptions').where('tier', 'mid').update({ tier: 'premium' });
    const ultraCount = await knex('subscriptions').where('tier', 'ultra').update({ tier: 'elite' });

    console.log(`Updated ${midCount} 'mid' subscriptions to 'premium'`);
    console.log(`Updated ${ultraCount} 'ultra' subscriptions to 'elite'`);

    // Add new constraint
    await knex.raw(`
      ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_tier_check
      CHECK (tier IN ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'))
    `);
  }

  // Step 3: Update user-service subscriptions table if it exists separately
  const hasUserServiceSubscriptions = await knex.schema.hasTable('user_subscriptions');

  if (hasUserServiceSubscriptions) {
    console.log('Migrating user_subscriptions table...');

    await knex.raw(`
      ALTER TABLE user_subscriptions
      DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check
    `);

    // Update existing subscriptions
    await knex('user_subscriptions').where('tier', 'mid').update({ tier: 'premium' });
    await knex('user_subscriptions').where('tier', 'ultra').update({ tier: 'elite' });

    await knex.raw(`
      ALTER TABLE user_subscriptions
      ADD CONSTRAINT user_subscriptions_tier_check
      CHECK (tier IN ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'))
    `);
  }

  // Step 4: Update subscription_features table if it exists
  const hasSubscriptionFeatures = await knex.schema.hasTable('subscription_features');

  if (hasSubscriptionFeatures) {
    console.log('Migrating subscription_features table...');

    await knex.raw(`
      ALTER TABLE subscription_features
      DROP CONSTRAINT IF EXISTS subscription_features_tier_check
    `);

    // Update existing features
    await knex('subscription_features').where('tier', 'mid').update({ tier: 'premium' });
    await knex('subscription_features').where('tier', 'ultra').update({ tier: 'elite' });

    await knex.raw(`
      ALTER TABLE subscription_features
      ADD CONSTRAINT subscription_features_tier_check
      CHECK (tier IN ('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'))
    `);
  }

  console.log('Subscription tier migration completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back subscription tier migration: 6-tier to 4-tier system...');

  // Step 1: Revert subscription_plans
  const hasSubscriptionPlans = await knex.schema.hasTable('subscription_plans');

  if (hasSubscriptionPlans) {
    console.log('Reverting subscription_plans table...');

    await knex.raw(`
      ALTER TABLE subscription_plans
      DROP CONSTRAINT IF EXISTS subscription_plans_tier_check
    `);

    // Delete new tiers
    await knex('subscription_plans').whereIn('tier', ['plus', 'premium_plus']).delete();

    // Revert tier names: premium -> mid, elite -> ultra
    await knex('subscription_plans').where('tier', 'premium').update({ tier: 'mid', name: 'mid' });
    await knex('subscription_plans').where('tier', 'elite').update({ tier: 'ultra', name: 'ultra' });

    await knex.raw(`
      ALTER TABLE subscription_plans
      ADD CONSTRAINT subscription_plans_tier_check
      CHECK (tier IN ('free', 'basic', 'mid', 'ultra'))
    `);
  }

  // Step 2: Revert subscriptions
  const hasSubscriptions = await knex.schema.hasTable('subscriptions');

  if (hasSubscriptions) {
    console.log('Reverting subscriptions table...');

    await knex.raw(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_tier_check
    `);

    // Users on new tiers get downgraded to nearest old tier
    await knex('subscriptions').where('tier', 'plus').update({ tier: 'basic' });
    await knex('subscriptions').where('tier', 'premium_plus').update({ tier: 'ultra' });
    await knex('subscriptions').where('tier', 'premium').update({ tier: 'mid' });
    await knex('subscriptions').where('tier', 'elite').update({ tier: 'ultra' });

    await knex.raw(`
      ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_tier_check
      CHECK (tier IN ('free', 'basic', 'mid', 'ultra'))
    `);
  }

  // Step 3: Revert user_subscriptions
  const hasUserServiceSubscriptions = await knex.schema.hasTable('user_subscriptions');

  if (hasUserServiceSubscriptions) {
    await knex.raw(`
      ALTER TABLE user_subscriptions
      DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check
    `);

    await knex('user_subscriptions').where('tier', 'plus').update({ tier: 'basic' });
    await knex('user_subscriptions').where('tier', 'premium_plus').update({ tier: 'ultra' });
    await knex('user_subscriptions').where('tier', 'premium').update({ tier: 'mid' });
    await knex('user_subscriptions').where('tier', 'elite').update({ tier: 'ultra' });

    await knex.raw(`
      ALTER TABLE user_subscriptions
      ADD CONSTRAINT user_subscriptions_tier_check
      CHECK (tier IN ('free', 'basic', 'mid', 'ultra'))
    `);
  }

  // Step 4: Revert subscription_features
  const hasSubscriptionFeatures = await knex.schema.hasTable('subscription_features');

  if (hasSubscriptionFeatures) {
    await knex.raw(`
      ALTER TABLE subscription_features
      DROP CONSTRAINT IF EXISTS subscription_features_tier_check
    `);

    await knex('subscription_features').whereIn('tier', ['plus', 'premium_plus']).delete();
    await knex('subscription_features').where('tier', 'premium').update({ tier: 'mid' });
    await knex('subscription_features').where('tier', 'elite').update({ tier: 'ultra' });

    await knex.raw(`
      ALTER TABLE subscription_features
      ADD CONSTRAINT subscription_features_tier_check
      CHECK (tier IN ('free', 'basic', 'mid', 'ultra'))
    `);
  }

  console.log('Subscription tier migration rollback completed!');
}
