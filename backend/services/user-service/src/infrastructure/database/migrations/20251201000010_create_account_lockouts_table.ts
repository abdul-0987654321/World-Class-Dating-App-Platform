import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('account_lockouts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('email', 255).notNullable();
    table.enum('lockout_reason', [
      'failed_login_attempts',
      'suspicious_activity',
      'security_breach',
      'admin_action',
      'terms_violation',
    ]).notNullable();
    table.timestamp('locked_at').defaultTo(knex.fn.now());
    table.timestamp('unlock_at'); // When the account will be automatically unlocked
    table.timestamp('unlocked_at'); // When it was actually unlocked
    table.boolean('is_permanent').defaultTo(false);
    table.integer('failed_attempts_count').defaultTo(0);
    table.text('unlock_token'); // Token to unlock the account via email
    table.text('ip_address');
    table.text('notes'); // Admin notes

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('email');
    table.index('unlock_token');
    table.index('unlock_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('account_lockouts');
}
