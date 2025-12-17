import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('encryption_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.text('identity_key_public').notNullable(); // Long-term identity key (public)
    table.text('identity_key_private').notNullable(); // Long-term identity key (private, encrypted)
    table.text('signed_pre_key_public').notNullable(); // Signed pre-key (public)
    table.text('signed_pre_key_private').notNullable(); // Signed pre-key (private, encrypted)
    table.text('signed_pre_key_signature').notNullable(); // Signature of signed pre-key
    table.integer('signed_pre_key_id').notNullable();
    table.integer('key_version').defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('rotated_at'); // When keys were last rotated
    table.timestamp('expires_at'); // When keys should be rotated
    table.boolean('is_active').defaultTo(true);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('encryption_keys');
}
