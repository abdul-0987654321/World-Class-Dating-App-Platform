import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_requests', (table) => {
    table.uuid('request_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', [
      'email',
      'phone',
      'id',
      'selfie',
      'liveness',
      'video',
      'biometric'
    ]).notNullable();
    table.enum('status', [
      'not_started',
      'pending',
      'in_review',
      'approved',
      'denied',
      'expired'
    ]).notNullable().defaultTo('not_started');
    table.string('region_policy_key', 100).nullable();
    table.timestamps(true, true);

    // Indexes for frequent queries
    table.index('user_id');
    table.index('type');
    table.index('status');
    table.index(['user_id', 'type']);
    table.index(['user_id', 'status']);
    table.index('created_at');
    table.index('region_policy_key');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verification_requests');
}
