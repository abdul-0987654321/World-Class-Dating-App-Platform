import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create boosts table
  await knex.schema.createTable('boosts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable().index();
    table.boolean('active').notNullable().defaultTo(true).index();
    table.integer('impressions').notNullable().defaultTo(0);
    table.integer('profile_views').notNullable().defaultTo(0);
    table.integer('likes').notNullable().defaultTo(0);
    table.integer('matches').notNullable().defaultTo(0);
    table.string('payment_id').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id', 'active']);
    table.index(['active', 'expires_at']);
  });

  console.log('Created boosts table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('boosts');
  console.log('Dropped boosts table');
}
