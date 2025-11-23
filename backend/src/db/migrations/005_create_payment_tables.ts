import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('stripe_customer_id').notNullable();
    table.string('stripe_subscription_id');
    table.enum('tier', ['free', 'premium', 'premium_plus']).defaultTo('free');
    table.enum('status', ['active', 'canceled', 'past_due', 'unpaid', 'trialing']).defaultTo('trialing');
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.timestamp('canceled_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('stripe_customer_id');
    table.index('stripe_subscription_id');
    table.index('status');
  });

  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['subscription', 'coin_purchase', 'refund', 'boost', 'super_like']).notNullable();
    table.integer('amount').notNullable(); // in cents
    table.string('currency').defaultTo('usd');
    table.string('stripe_payment_intent_id');
    table.string('stripe_charge_id');
    table.enum('status', ['pending', 'succeeded', 'failed', 'refunded']).defaultTo('pending');
    table.text('description');
    table.jsonb('metadata');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('stripe_payment_intent_id');
    table.index('status');
    table.index('created_at');
  });

  await knex.schema.createTable('coin_transactions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('amount').notNullable(); // Positive or negative
    table.enum('type', ['purchase', 'spend', 'refund', 'bonus']).notNullable();
    table.string('reason');
    table.integer('balance_after').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('coin_transactions');
  await knex.schema.dropTable('transactions');
  await knex.schema.dropTable('subscriptions');
}
