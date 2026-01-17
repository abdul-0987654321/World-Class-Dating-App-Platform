/**
 * Migration: Add unique constraints for data consistency
 *
 * This migration adds unique constraints to prevent duplicate entries
 * from concurrent operations (race conditions).
 *
 * Tables affected:
 * - swipes: Prevent duplicate swipes (user_id, target_user_id)
 * - matches: Prevent duplicate matches (user1_id, user2_id)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add unique constraint on swipes to prevent duplicate swipes
  // This is the primary defense against the race condition where
  // a user swipes multiple times on the same person
  const hasSwipesTable = await knex.schema.hasTable('swipes');
  if (hasSwipesTable) {
    // Check if constraint already exists
    const existingConstraints = await knex.raw(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'swipes'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'swipes_user_target_unique'
    `);

    if (existingConstraints.rows.length === 0) {
      await knex.schema.alterTable('swipes', (table) => {
        table.unique(['user_id', 'target_user_id'], { indexName: 'swipes_user_target_unique' });
      });
    }
  }

  // Add unique constraint on matches to prevent duplicate matches
  // user1_id and user2_id are always stored in sorted order
  const hasMatchesTable = await knex.schema.hasTable('matches');
  if (hasMatchesTable) {
    const existingMatchConstraints = await knex.raw(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'matches'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'matches_users_unique'
    `);

    if (existingMatchConstraints.rows.length === 0) {
      await knex.schema.alterTable('matches', (table) => {
        table.unique(['user1_id', 'user2_id'], { indexName: 'matches_users_unique' });
      });
    }
  }

  // Add unique constraint on swipe_history for idempotency
  const hasSwipeHistoryTable = await knex.schema.hasTable('swipe_history');
  if (hasSwipeHistoryTable) {
    const existingHistoryConstraints = await knex.raw(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'swipe_history'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'swipe_history_original_swipe_unique'
    `);

    if (existingHistoryConstraints.rows.length === 0) {
      await knex.schema.alterTable('swipe_history', (table) => {
        // Original swipe ID should be unique in history
        table.unique(['original_swipe_id'], { indexName: 'swipe_history_original_swipe_unique' });
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSwipesTable = await knex.schema.hasTable('swipes');
  if (hasSwipesTable) {
    await knex.schema.alterTable('swipes', (table) => {
      table.dropUnique(['user_id', 'target_user_id'], 'swipes_user_target_unique');
    });
  }

  const hasMatchesTable = await knex.schema.hasTable('matches');
  if (hasMatchesTable) {
    await knex.schema.alterTable('matches', (table) => {
      table.dropUnique(['user1_id', 'user2_id'], 'matches_users_unique');
    });
  }

  const hasSwipeHistoryTable = await knex.schema.hasTable('swipe_history');
  if (hasSwipeHistoryTable) {
    await knex.schema.alterTable('swipe_history', (table) => {
      table.dropUnique(['original_swipe_id'], 'swipe_history_original_swipe_unique');
    });
  }
}
