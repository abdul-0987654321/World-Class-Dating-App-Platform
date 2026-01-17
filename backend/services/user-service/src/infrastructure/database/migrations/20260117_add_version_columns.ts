/**
 * Migration: Add version columns for optimistic locking
 *
 * This migration adds version columns to tables that require
 * optimistic locking for data consistency and concurrency control.
 *
 * Tables affected:
 * - coins: For coin balance operations
 * - gems: For gem balance operations
 * - subscriptions: For subscription state changes
 * - boosts: For boost activation
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add version column to coins table
  const hasCoinsVersion = await knex.schema.hasColumn('coins', 'version');
  if (!hasCoinsVersion) {
    await knex.schema.alterTable('coins', (table) => {
      table.integer('version').notNullable().defaultTo(1);
    });
  }

  // Add version column to gems table
  const hasGemsVersion = await knex.schema.hasColumn('gems', 'version');
  if (!hasGemsVersion) {
    await knex.schema.alterTable('gems', (table) => {
      table.integer('version').notNullable().defaultTo(1);
    });
  }

  // Add version column to user_subscriptions table if it exists
  const hasSubscriptionsTable = await knex.schema.hasTable('user_subscriptions');
  if (hasSubscriptionsTable) {
    const hasSubscriptionsVersion = await knex.schema.hasColumn('user_subscriptions', 'version');
    if (!hasSubscriptionsVersion) {
      await knex.schema.alterTable('user_subscriptions', (table) => {
        table.integer('version').notNullable().defaultTo(1);
      });
    }
  }

  // Add version column to active_boosts table if it exists
  const hasBoostsTable = await knex.schema.hasTable('active_boosts');
  if (hasBoostsTable) {
    const hasBoostsVersion = await knex.schema.hasColumn('active_boosts', 'version');
    if (!hasBoostsVersion) {
      await knex.schema.alterTable('active_boosts', (table) => {
        table.integer('version').notNullable().defaultTo(1);
      });
    }
  }

  // Add unique constraint on coin_transactions for idempotency
  const hasCoinTransactions = await knex.schema.hasTable('coin_transactions');
  if (hasCoinTransactions) {
    // Add index for reference_id + reference_type for idempotency lookups
    await knex.schema.alterTable('coin_transactions', (table) => {
      table.index(['reference_id', 'reference_type'], 'idx_coin_transactions_reference');
    });
  }

  // Add unique constraint on gem_transactions for idempotency
  const hasGemTransactions = await knex.schema.hasTable('gem_transactions');
  if (hasGemTransactions) {
    await knex.schema.alterTable('gem_transactions', (table) => {
      table.index(['user_id', 'type', 'created_at'], 'idx_gem_transactions_user_type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove version columns
  const hasCoinsVersion = await knex.schema.hasColumn('coins', 'version');
  if (hasCoinsVersion) {
    await knex.schema.alterTable('coins', (table) => {
      table.dropColumn('version');
    });
  }

  const hasGemsVersion = await knex.schema.hasColumn('gems', 'version');
  if (hasGemsVersion) {
    await knex.schema.alterTable('gems', (table) => {
      table.dropColumn('version');
    });
  }

  const hasSubscriptionsTable = await knex.schema.hasTable('user_subscriptions');
  if (hasSubscriptionsTable) {
    const hasSubscriptionsVersion = await knex.schema.hasColumn('user_subscriptions', 'version');
    if (hasSubscriptionsVersion) {
      await knex.schema.alterTable('user_subscriptions', (table) => {
        table.dropColumn('version');
      });
    }
  }

  const hasBoostsTable = await knex.schema.hasTable('active_boosts');
  if (hasBoostsTable) {
    const hasBoostsVersion = await knex.schema.hasColumn('active_boosts', 'version');
    if (hasBoostsVersion) {
      await knex.schema.alterTable('active_boosts', (table) => {
        table.dropColumn('version');
      });
    }
  }

  // Remove indexes
  const hasCoinTransactions = await knex.schema.hasTable('coin_transactions');
  if (hasCoinTransactions) {
    await knex.schema.alterTable('coin_transactions', (table) => {
      table.dropIndex(['reference_id', 'reference_type'], 'idx_coin_transactions_reference');
    });
  }

  const hasGemTransactions = await knex.schema.hasTable('gem_transactions');
  if (hasGemTransactions) {
    await knex.schema.alterTable('gem_transactions', (table) => {
      table.dropIndex(['user_id', 'type', 'created_at'], 'idx_gem_transactions_user_type');
    });
  }
}
