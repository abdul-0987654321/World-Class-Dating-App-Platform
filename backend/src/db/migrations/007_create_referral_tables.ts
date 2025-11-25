/**
 * Migration: Create Referral Tables
 * Tables for referral codes, tracking, and rewards
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Referral codes table
  await knex.schema.createTable('referral_codes', (table) => {
    table.string('code').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_custom').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('usage_count').notNullable().defaultTo(0);
    table.integer('max_uses'); // null = unlimited
    table.timestamp('expires_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('is_active');
  });

  // Referrals table
  await knex.schema.createTable('referrals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referrer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('referred_user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('referral_code').notNullable().references('code').inTable('referral_codes');
    table.enum('status', ['pending', 'validated', 'rewarded', 'expired', 'invalid']).notNullable().defaultTo('pending');
    table.timestamp('validated_at');
    table.timestamp('rewarded_at');
    table.jsonb('referrer_reward').defaultTo('{}');
    table.jsonb('referred_reward').defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('referrer_id');
    table.index('status');
    table.index('created_at');
  });

  // Referral tiers configuration table
  await knex.schema.createTable('referral_tiers', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.integer('min_referrals').notNullable();
    table.integer('coin_bonus').notNullable().defaultTo(0);
    table.integer('gem_bonus').notNullable().defaultTo(0);
    table.integer('subscription_days');
    table.string('subscription_tier');
    table.string('badge').notNullable();
    table.integer('display_order').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // User referral stats table
  await knex.schema.createTable('user_referral_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_referrals').notNullable().defaultTo(0);
    table.integer('successful_referrals').notNullable().defaultTo(0);
    table.integer('pending_referrals').notNullable().defaultTo(0);
    table.integer('total_coins_earned').notNullable().defaultTo(0);
    table.integer('total_gems_earned').notNullable().defaultTo(0);
    table.string('current_tier_id').references('id').inTable('referral_tiers');
    table.timestamp('tier_achieved_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Referral validation criteria tracking
  await knex.schema.createTable('referral_validation_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referral_id').notNullable().references('id').inTable('referrals').onDelete('CASCADE');
    table.uuid('referred_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('photo_count').notNullable().defaultTo(0);
    table.boolean('has_bio').notNullable().defaultTo(false);
    table.integer('active_days').notNullable().defaultTo(0);
    table.boolean('phone_verified').notNullable().defaultTo(false);
    table.boolean('all_criteria_met').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('referral_id');
    table.index('referred_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('referral_validation_progress');
  await knex.schema.dropTableIfExists('user_referral_stats');
  await knex.schema.dropTableIfExists('referral_tiers');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('referral_codes');
}
