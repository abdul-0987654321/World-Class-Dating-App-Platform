import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('swipes', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('target_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();
    table.timestamp('swiped_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'target_user_id']);
    table.index('user_id');
    table.index('target_user_id');
    table.index('action');
  });

  await knex.schema.createTable('matches', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id_1').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user_id_2').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('matched_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_message_at');
    table.integer('unread_count_user_1').defaultTo(0);
    table.integer('unread_count_user_2').defaultTo(0);
    table.timestamps(true, true);

    table.index('user_id_1');
    table.index('user_id_2');
    table.index('is_active');
    table.index('last_message_at');
  });

  await knex.schema.createTable('daily_limits', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('likes_count').defaultTo(0);
    table.integer('super_likes_count').defaultTo(0);
    table.integer('rewinds_count').defaultTo(0);
    table.integer('boosts_count').defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'date']);
    table.index(['user_id', 'date']);
  });

  await knex.schema.createTable('boosts', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('started_at').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('views_gained').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index(['is_active', 'expires_at']);
  });

  await knex.schema.createTable('blocks', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blocked_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason');
    table.timestamp('blocked_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'blocked_user_id']);
    table.index('user_id');
    table.index('blocked_user_id');
  });

  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary();
    table.uuid('reporter_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reported_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reason').notNullable();
    table.text('details');
    table.enum('status', ['pending', 'reviewed', 'action_taken', 'dismissed']).defaultTo('pending');
    table.uuid('reviewed_by').references('id').inTable('users');
    table.timestamp('reviewed_at');
    table.text('action_taken');
    table.timestamps(true, true);

    table.index('status');
    table.index('reporter_user_id');
    table.index('reported_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('reports');
  await knex.schema.dropTable('blocks');
  await knex.schema.dropTable('boosts');
  await knex.schema.dropTable('daily_limits');
  await knex.schema.dropTable('matches');
  await knex.schema.dropTable('swipes');
}
