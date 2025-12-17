import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create reports table
  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('reporter_id').notNullable().index();
    table.uuid('reported_user_id').index();
    table.uuid('content_id').index();
    table.string('report_type', 50).notNullable().index(); // 'user', 'content', 'message', etc.
    table.string('reason', 255).notNullable();
    table.text('description');
    table.string('status', 50).notNullable().defaultTo('pending').index(); // 'pending', 'reviewing', 'resolved', 'dismissed'
    table.uuid('resolved_by').index();
    table.timestamp('resolved_at');
    table.text('resolution_notes');
    table.string('resolution_action', 100); // 'no_action', 'content_removed', 'user_warned', 'user_suspended', 'user_banned'
    table.timestamps(true, true);

    // Indexes
    table.index(['reporter_id', 'created_at']);
    table.index(['reported_user_id', 'created_at']);
    table.index(['status', 'created_at']);
    table.index('report_type');
  });

  // Create user_blocks table
  await knex.schema.createTable('user_blocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('blocked_user_id').notNullable().index();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate blocks
    table.unique(['user_id', 'blocked_user_id']);

    // Indexes
    table.index(['user_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_blocks');
  await knex.schema.dropTableIfExists('reports');
}
