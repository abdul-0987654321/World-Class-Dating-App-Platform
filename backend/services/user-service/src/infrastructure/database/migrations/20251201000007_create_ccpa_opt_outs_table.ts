import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('ccpa_opt_outs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table
      .enum('opt_out_type', ['do_not_sell', 'do_not_share', 'limit_use_sensitive_data'])
      .notNullable();
    table.boolean('opted_out').notNullable();
    table.timestamp('opted_out_at').defaultTo(knex.fn.now());
    table.timestamp('opted_in_at');
    table.text('ip_address');
    table.text('user_agent');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'opt_out_type']);
    table.unique(['user_id', 'opt_out_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('ccpa_opt_outs');
}
