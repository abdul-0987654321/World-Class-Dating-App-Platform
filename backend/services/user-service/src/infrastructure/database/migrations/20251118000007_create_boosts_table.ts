import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('boosts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['standard', 'prime_time', 'spotlight']).notNullable().defaultTo('standard');
    table
      .enum('status', ['pending', 'active', 'completed', 'expired', 'canceled'])
      .notNullable()
      .defaultTo('pending');
    table.integer('duration_minutes').notNullable();
    table.integer('visibility_multiplier').notNullable().defaultTo(10);
    table.timestamp('started_at').nullable();
    table.timestamp('expires_at').nullable();
    table.integer('impressions_gained').notNullable().defaultTo(0);
    table.integer('likes_gained').notNullable().defaultTo(0);
    table.integer('matches_gained').notNullable().defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index(['user_id', 'status']);
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('boosts');
}
