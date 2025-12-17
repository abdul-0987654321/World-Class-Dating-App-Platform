import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('tier', ['free', 'basic', 'mid', 'ultra']).notNullable().defaultTo('free');
    table.enum('status', ['active', 'canceled', 'expired', 'past_due', 'trialing']).notNullable().defaultTo('active');
    table.string('stripe_subscription_id', 100).nullable().unique();
    table.string('stripe_customer_id', 100).nullable();
    table.string('stripe_price_id', 100).nullable();
    table.timestamp('current_period_start').nullable();
    table.timestamp('current_period_end').nullable();
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.timestamp('canceled_at').nullable();
    table.timestamp('trial_start').nullable();
    table.timestamp('trial_end').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('tier');
    table.index('stripe_subscription_id');
    table.index('stripe_customer_id');

    // Unique constraint: one active subscription per user
    table.unique(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('subscriptions');
}
