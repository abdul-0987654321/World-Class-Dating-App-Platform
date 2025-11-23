import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('swipes', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User references
    table.uuid('user_id').notNullable().index();
    table.uuid('target_user_id').notNullable().index();

    // Swipe action
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Composite indexes
    table.index(['user_id', 'target_user_id']);
    table.index(['target_user_id', 'action']);
    table.index(['user_id', 'created_at']);

    // Unique constraint: user can only swipe once on a target
    table.unique(['user_id', 'target_user_id']);
  });

  // Create index for faster lookups
  await knex.raw(`
    CREATE INDEX idx_swipes_like_actions
    ON swipes(target_user_id, action)
    WHERE action IN ('like', 'super_like');
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swipes');
}
