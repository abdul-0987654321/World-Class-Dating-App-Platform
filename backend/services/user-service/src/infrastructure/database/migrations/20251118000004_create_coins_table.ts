import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('coins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('balance').notNullable().defaultTo(0);
    table.integer('total_earned').notNullable().defaultTo(0);
    table.integer('total_spent').notNullable().defaultTo(0);
    table.integer('total_purchased').notNullable().defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('balance');

    // Check constraint: balance must be non-negative
    table.check('balance >= 0', [], 'coins_balance_non_negative');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('coins');
}
