import { Knex } from 'knex';

/**
 * Create SOS notification logs table
 * Tracks all notification attempts for SOS alerts
 */
export async function up(knex: Knex): Promise<void> {
  // SOS Notification Logs table
  await knex.schema.createTable('sos_notification_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_id').notNullable().references('id').inTable('sos_alerts').onDelete('CASCADE');
    table.uuid('contact_id').notNullable().references('id').inTable('emergency_contacts').onDelete('CASCADE');
    table.string('contact_name', 100).notNullable();
    table.string('contact_phone', 20).nullable();
    table.string('contact_email', 255).nullable();
    table
      .enum('notification_type', [
        'sos_alert',
        'sos_cancelled',
        'sos_resolved',
        'checkin_missed',
        'checkin_reminder',
        'sos_escalated',
      ])
      .notNullable();
    table.enum('channel', ['sms', 'email', 'push']).notNullable();
    table
      .enum('status', ['pending', 'sent', 'delivered', 'failed', 'retrying'])
      .notNullable()
      .defaultTo('pending');
    table.string('external_id', 255).nullable(); // Twilio message SID, etc.
    table.text('error_message').nullable();
    table.integer('retry_count').notNullable().defaultTo(0);
    table.timestamp('sent_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for querying
    table.index('alert_id');
    table.index('contact_id');
    table.index('status');
    table.index('notification_type');
    table.index('created_at');
    table.index(['alert_id', 'status']); // For finding failed notifications to retry
  });

  // SOS Escalation Logs table - tracks escalations to support team
  await knex.schema.createTable('sos_escalation_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('alert_id').notNullable().references('id').inTable('sos_alerts').onDelete('CASCADE');
    table.string('escalation_reason', 500).notNullable();
    table.boolean('support_notified').notNullable().defaultTo(false);
    table.string('support_email_sent_to', 255).nullable();
    table.uuid('assigned_to').nullable(); // Staff member assigned
    table.text('notes').nullable();
    table.enum('resolution_status', ['pending', 'reviewing', 'resolved', 'false_alarm']).defaultTo('pending');
    table.timestamp('resolved_at').nullable();
    table.text('resolution_notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('alert_id');
    table.index('resolution_status');
    table.index('created_at');
  });

  // Add escalation tracking to sos_alerts if not exists
  const hasEscalatedAt = await knex.schema.hasColumn('sos_alerts', 'escalated_at');
  if (!hasEscalatedAt) {
    await knex.schema.alterTable('sos_alerts', (table) => {
      table.timestamp('escalated_at').nullable();
      table.integer('escalation_level').defaultTo(0);
      table.uuid('last_escalation_id').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove added columns from sos_alerts
  const hasEscalatedAt = await knex.schema.hasColumn('sos_alerts', 'escalated_at');
  if (hasEscalatedAt) {
    await knex.schema.alterTable('sos_alerts', (table) => {
      table.dropColumn('escalated_at');
      table.dropColumn('escalation_level');
      table.dropColumn('last_escalation_id');
    });
  }

  await knex.schema.dropTableIfExists('sos_escalation_logs');
  await knex.schema.dropTableIfExists('sos_notification_logs');
}
