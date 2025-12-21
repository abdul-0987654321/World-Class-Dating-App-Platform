import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('profile_versions', (table) => {
    table.uuid('version_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('payload_json').notNullable(); // Snapshot of profile data at this version
    table.integer('version_number').notNullable();
    table.string('change_reason', 255).nullable(); // e.g., 'user_update', 'admin_correction', 'moderation'
    table.uuid('changed_by').nullable().references('id').inTable('users').onDelete('SET NULL'); // User or admin who made the change
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'version_number']);
    table.index('created_at');
    table.unique(['user_id', 'version_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('profile_versions');
}
