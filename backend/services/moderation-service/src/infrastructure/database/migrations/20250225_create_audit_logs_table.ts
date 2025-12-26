import { Knex } from 'knex';

/**
 * Migration to create the moderation_audit_logs table
 *
 * This table is critical for security and compliance purposes.
 * It records all admin/moderator actions for audit trails and
 * helps detect and investigate potential admin impersonation attacks.
 */
export async function up(knex: Knex): Promise<void> {
  // Create moderation_audit_logs table
  await knex.schema.createTable('moderation_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('action', 100).notNullable().index();
    table.uuid('admin_id').notNullable().index();
    table.uuid('target_user_id').notNullable().index();
    table.jsonb('details').notNullable().defaultTo('{}');
    table.string('ip_address', 45); // IPv6 max length
    table.text('user_agent');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for common query patterns
    table.index(['admin_id', 'created_at']);
    table.index(['target_user_id', 'created_at']);
    table.index(['action', 'created_at']);
    table.index('created_at');
  });

  // Add comment to table for documentation
  await knex.raw(`
    COMMENT ON TABLE moderation_audit_logs IS
    'Security audit trail for all admin and moderator actions.
    Critical for compliance and investigating potential security incidents.';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('moderation_audit_logs');
}
