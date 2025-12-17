import { Knex } from 'knex';

/**
 * DEPRECATED: This migration has been converted to a seed file.
 * See seeds/05_opening_move_templates.ts instead.
 * This migration is kept as a no-op to maintain migration history.
 */
export async function up(knex: Knex): Promise<void> {
  // Migration converted to seed file - see seeds/05_opening_move_templates.ts
  // This is now a no-op migration to maintain migration order
  return Promise.resolve();
}

export async function down(knex: Knex): Promise<void> {
  // No action needed - data is managed by seed files
  return Promise.resolve();
}
