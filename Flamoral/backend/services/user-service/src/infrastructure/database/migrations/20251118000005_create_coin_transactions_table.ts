import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('coin_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['purchase', 'reward', 'spent', 'refund', 'admin_adjustment']).notNullable();
    table.integer('amount').notNullable(); // Positive for credit, negative for debit
    table.integer('balance_after').notNullable();
    table.string('reason', 255).notNullable();
    table.uuid('reference_id').nullable(); // Reference to boost, purchase, etc.
    table.string('reference_type', 50).nullable(); // 'boost', 'super_like', 'purchase', etc.
    table.jsonb('metadata').nullable(); // Additional transaction details
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('type');
    table.index('created_at');
    table.index('reference_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('coin_transactions');
}
