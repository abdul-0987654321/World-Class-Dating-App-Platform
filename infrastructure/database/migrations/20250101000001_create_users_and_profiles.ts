import { Knex } from 'knex';

/**
 * Migration: Create Users and Profiles Tables
 * Description: Core user authentication and profile information
 */
export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('phone_number', 20).nullable();

    // Account status
    table.enum('status', ['active', 'inactive', 'suspended', 'banned', 'deleted'])
      .notNullable()
      .defaultTo('active');

    // Subscription tier
    table.enum('subscription_tier', ['free', 'basic', 'mid', 'ultra'])
      .notNullable()
      .defaultTo('free');

    // Verification flags
    table.boolean('is_email_verified').defaultTo(false);
    table.boolean('is_phone_verified').defaultTo(false);
    table.boolean('is_photo_verified').defaultTo(false);

    // Activity tracking
    table.timestamp('last_login_at').nullable();
    table.timestamp('last_active_at').nullable();

    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('email');
    table.index('status');
    table.index('subscription_tier');
    table.index('created_at');
    table.index('last_active_at');
  });

  // Create profiles table
  await knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');

    // Basic information
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.date('date_of_birth').notNullable();
    table.enum('gender', ['male', 'female', 'non-binary', 'other', 'prefer_not_to_say'])
      .notNullable();

    // Profile content
    table.text('bio').nullable();
    table.string('occupation', 100).nullable();
    table.string('education', 100).nullable();
    table.string('company', 100).nullable();
    table.string('school', 100).nullable();
    table.integer('height').nullable(); // in cm

    // Location information
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('country', 100).nullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();

    // Additional attributes
    table.jsonb('interests').defaultTo('[]');
    table.jsonb('languages').defaultTo('[]');
    table.enum('relationship_type', [
      'long_term',
      'short_term',
      'friendship',
      'casual',
      'open_to_anything'
    ]).nullable();

    // Profile completeness
    table.integer('profile_completion_percentage').defaultTo(0);

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index(['latitude', 'longitude']);
    table.index('city');
    table.index('country');
    table.index('date_of_birth');
  });

  // Create verification_tokens table (for email/phone verification)
  await knex.schema.createTable('verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.enum('type', ['email', 'phone', 'password_reset', 'two_factor'])
      .notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('token');
    table.index(['token', 'type']);
    table.index('expires_at');
  });

  // Create refresh_tokens table (for JWT refresh tokens)
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.string('device_id', 255).nullable();
    table.string('device_name', 100).nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_revoked').defaultTo(false);
    table.timestamp('revoked_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('token');
    table.index('expires_at');
    table.index('is_revoked');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('verification_tokens');
  await knex.schema.dropTableIfExists('profiles');
  await knex.schema.dropTableIfExists('users');
}
