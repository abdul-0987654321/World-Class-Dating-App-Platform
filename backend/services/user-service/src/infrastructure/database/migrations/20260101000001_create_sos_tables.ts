import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // SOS Alerts table
  await knex.schema.createTable('sos_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .enum('status', ['active', 'resolved', 'cancelled', 'escalated'])
      .notNullable()
      .defaultTo('active');
    table
      .enum('alert_type', ['emergency', 'uncomfortable', 'checkin_missed', 'manual'])
      .notNullable();
    table.jsonb('location').nullable();
    table.text('reason').nullable();
    table.jsonb('emergency_contacts_notified').defaultTo('[]');
    table.text('resolution_notes').nullable();
    table.timestamp('resolved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('created_at');
  });

  // Emergency Contacts table
  await knex.schema.createTable('emergency_contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('phone', 20).notNullable();
    table.string('email', 255).nullable();
    table.enum('relationship', ['family', 'friend', 'partner', 'other']).notNullable();
    table.boolean('notify_on_sos').notNullable().defaultTo(true);
    table.boolean('notify_on_checkin_miss').notNullable().defaultTo(true);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
  });

  // Safety Checkins table
  await knex.schema.createTable('safety_checkins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('scheduled_at').notNullable();
    table.timestamp('checked_in_at').nullable();
    table
      .enum('status', ['scheduled', 'active', 'checked_in', 'missed', 'cancelled'])
      .notNullable()
      .defaultTo('scheduled');
    table.jsonb('meeting_details').nullable();
    table.boolean('reminder_sent').notNullable().defaultTo(false);
    table.boolean('escalated').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('scheduled_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('safety_checkins');
  await knex.schema.dropTableIfExists('emergency_contacts');
  await knex.schema.dropTableIfExists('sos_alerts');
}
