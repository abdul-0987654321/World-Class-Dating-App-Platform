import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('gdpr_consents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table
      .enum('consent_type', [
        'terms_of_service',
        'privacy_policy',
        'data_processing',
        'marketing_emails',
        'analytics',
        'third_party_sharing',
        'cookies',
        'location_data',
        'photo_usage',
      ])
      .notNullable();
    table.boolean('granted').notNullable();
    table.string('version', 50).notNullable(); // Version of consent document
    table.text('ip_address'); // IP address at time of consent
    table.text('user_agent'); // User agent at time of consent
    table.timestamp('granted_at').defaultTo(knex.fn.now());
    table.timestamp('revoked_at');
    table.text('revocation_reason');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'consent_type']);
    table.index('granted_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('gdpr_consents');
}
