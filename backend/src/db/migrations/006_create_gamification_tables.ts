/**
 * Migration: Create Gamification Tables
 * Tables for streaks, achievements, quests, rewards, and spin wheel
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User streaks table
  await knex.schema.createTable('user_streaks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('current_streak').notNullable().defaultTo(0);
    table.integer('longest_streak').notNullable().defaultTo(0);
    table.date('last_login_date');
    table.date('streak_start_date');
    table.integer('total_logins').notNullable().defaultTo(0);
    table.boolean('missed_day_grace_used').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Daily rewards claimed table
  await knex.schema.createTable('daily_rewards_claimed', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('claimed_date').notNullable();
    table.integer('day_number').notNullable();
    table.integer('coins_awarded').notNullable().defaultTo(0);
    table.integer('gems_awarded').notNullable().defaultTo(0);
    table.jsonb('bonus_rewards').defaultTo('{}');
    table.integer('streak_at_claim').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'claimed_date']);
    table.index(['user_id', 'claimed_date']);
  });

  // Achievements definition table
  await knex.schema.createTable('achievements', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.string('category').notNullable();
    table.string('icon').notNullable();
    table.integer('coin_reward').notNullable().defaultTo(0);
    table.integer('gem_reward').notNullable().defaultTo(0);
    table.integer('required_value').notNullable().defaultTo(1);
    table.boolean('is_hidden').notNullable().defaultTo(false);
    table.string('tier').notNullable().defaultTo('bronze');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('category');
  });

  // User achievements progress table
  await knex.schema.createTable('user_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('achievement_id').notNullable().references('id').inTable('achievements').onDelete('CASCADE');
    table.integer('progress').notNullable().defaultTo(0);
    table.boolean('is_unlocked').notNullable().defaultTo(false);
    table.timestamp('unlocked_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'achievement_id']);
    table.index(['user_id', 'is_unlocked']);
  });

  // Quest definitions table
  await knex.schema.createTable('quests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.enum('type', ['daily', 'weekly']).notNullable();
    table.integer('coin_reward').notNullable().defaultTo(0);
    table.integer('gem_reward').notNullable().defaultTo(0);
    table.string('required_action').notNullable();
    table.integer('required_count').notNullable().defaultTo(1);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('type');
    table.index('required_action');
  });

  // User quests progress table
  await knex.schema.createTable('user_quests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('quest_id').notNullable().references('id').inTable('quests').onDelete('CASCADE');
    table.integer('progress').notNullable().defaultTo(0);
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.timestamp('completed_at');
    table.date('assigned_date').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'quest_id', 'assigned_date']);
    table.index(['user_id', 'assigned_date']);
  });

  // Spin wheel segments table
  await knex.schema.createTable('spin_wheel_segments', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.decimal('probability', 5, 4).notNullable();
    table.string('reward_type').notNullable();
    table.integer('reward_amount').notNullable();
    table.string('color').notNullable();
    table.integer('display_order').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Spin wheel history table
  await knex.schema.createTable('spin_wheel_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('segment_id').notNullable().references('id').inTable('spin_wheel_segments');
    table.string('reward_type').notNullable();
    table.integer('reward_amount').notNullable();
    table.boolean('was_paid_spin').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
  });

  // User wallet/balance table
  await knex.schema.createTable('user_wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('coins').notNullable().defaultTo(0);
    table.integer('gems').notNullable().defaultTo(0);
    table.integer('super_likes').notNullable().defaultTo(0);
    table.integer('boost_minutes').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Wallet transactions table
  await knex.schema.createTable('wallet_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('currency_type', ['coins', 'gems', 'super_likes', 'boost_minutes']).notNullable();
    table.integer('amount').notNullable();
    table.enum('transaction_type', ['credit', 'debit']).notNullable();
    table.string('source').notNullable(); // daily_reward, spin_wheel, purchase, quest_reward, etc.
    table.string('reference_id'); // Related entity ID
    table.integer('balance_after').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'currency_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wallet_transactions');
  await knex.schema.dropTableIfExists('user_wallets');
  await knex.schema.dropTableIfExists('spin_wheel_history');
  await knex.schema.dropTableIfExists('spin_wheel_segments');
  await knex.schema.dropTableIfExists('user_quests');
  await knex.schema.dropTableIfExists('quests');
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievements');
  await knex.schema.dropTableIfExists('daily_rewards_claimed');
  await knex.schema.dropTableIfExists('user_streaks');
}
