import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email').notNullable().unique();
    table.boolean('email_verified').defaultTo(false);
    table.string('phone');
    table.boolean('phone_verified').defaultTo(false);
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name');
    table.date('date_of_birth').notNullable();
    table.enum('gender', ['male', 'female', 'other', 'prefer_not_to_say']).notNullable();
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.enum('subscription_tier', ['free', 'premium', 'premium_plus']).defaultTo('free');
    table.timestamp('subscription_expires_at');
    table.integer('coin_balance').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_banned').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('last_login_at');
    table.timestamp('last_active_at');
    table.timestamps(true, true);
    table.timestamp('deleted_at');

    // Indexes
    table.index('email');
    table.index('phone');
    table.index(['is_active', 'is_banned']);
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
