import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.date('date_of_birth').notNullable();
    table
      .enum('gender', ['male', 'female', 'non-binary', 'other', 'prefer_not_to_say'])
      .notNullable();
    table.string('phone_number', 20);
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_email_verified').defaultTo(false);
    table.boolean('is_phone_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamps(true, true);

    // Indexes
    table.index('email');
    table.index('is_active');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
