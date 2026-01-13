/**
 * Migration: Add isBeforeMatch field to Messages
 *
 * Purpose: Enables the "Message Before Match" premium feature
 * - Premium+ and Elite subscribers can send messages before matching
 * - This field indicates if a message was sent before users matched
 * - Frontend can style these messages differently (e.g., "Sent before you matched")
 *
 * Schema Change (PostgreSQL):
 * - messages table: Add optional is_before_match (boolean) column
 * - Default: false
 * - True only when message is sent before mutual match by premium user
 *
 * Affected Services:
 * - messaging-service: Creates messages with isBeforeMatch flag
 * - user-service: Provides subscription tier checks (Premium+, Elite)
 * - realtime-service: Passes isBeforeMatch in WebSocket events
 *
 * Feature Requirements:
 * - Subscription tiers: Premium+ or Elite required
 * - When no match exists and user has feature, isBeforeMatch = true
 * - When no match exists and user lacks feature, message is rejected
 *
 * @since 2026-01-02
 * @feature MESSAGE_BEFORE_MATCH
 * @requiredTier premium_plus | elite
 */

import { Knex } from 'knex';

/**
 * Add is_before_match column to messages table
 */
export async function up(knex: Knex): Promise<void> {
  const hasMessagesTable = await knex.schema.hasTable('messages');

  if (hasMessagesTable) {
    await knex.schema.alterTable('messages', (table) => {
      // Add isBeforeMatch column
      table.boolean('is_before_match').defaultTo(false);

      // Add index for querying before-match messages
      table.index('is_before_match', 'idx_messages_is_before_match');
    });
  }

  console.log('[Migration] Added is_before_match column to messages table');
}

export async function down(knex: Knex): Promise<void> {
  const hasMessagesTable = await knex.schema.hasTable('messages');

  if (hasMessagesTable) {
    await knex.schema.alterTable('messages', (table) => {
      table.dropIndex('is_before_match', 'idx_messages_is_before_match');
      table.dropColumn('is_before_match');
    });
  }

  console.log('[Migration] Removed is_before_match column from messages table');
}
