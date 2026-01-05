import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_results', (table) => {
    table.uuid('result_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('request_id')
      .notNullable()
      .references('request_id')
      .inTable('verification_requests')
      .onDelete('CASCADE');
    table.enum('decision', ['approved', 'denied', 'needs_review', 'inconclusive']).notNullable();
    table.string('reason_code', 100).nullable(); // e.g., 'document_expired', 'face_mismatch', 'low_quality'
    table.jsonb('details').nullable(); // Additional decision details
    table.decimal('confidence_score', 5, 4).nullable(); // 0.0000 to 9.9999
    table.timestamp('decided_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('request_id');
    table.index('decision');
    table.index('reason_code');
    table.index('decided_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verification_results');
}
