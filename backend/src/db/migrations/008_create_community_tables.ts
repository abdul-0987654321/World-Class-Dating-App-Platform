/**
 * Migration: Create Community Tables
 * Tables for interest-based communities, posts, and events
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Communities table
  await knex.schema.createTable('communities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.text('description').notNullable();
    table.string('icon').notNullable();
    table.string('cover_image');
    table.string('category').notNullable();
    table.integer('member_count').notNullable().defaultTo(0);
    table.boolean('is_default').notNullable().defaultTo(false);
    table.boolean('is_public').notNullable().defaultTo(true);
    table.boolean('is_premium').notNullable().defaultTo(false);
    table.integer('entry_fee'); // in coins
    table.jsonb('rules').defaultTo('[]');
    table.jsonb('tags').defaultTo('[]');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('category');
    table.index('is_public');
    table.index('member_count');
  });

  // Community members table
  await knex.schema.createTable('community_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['member', 'moderator', 'admin', 'owner']).notNullable().defaultTo('member');
    table.boolean('is_muted').notNullable().defaultTo(false);
    table.timestamp('muted_until');
    table.string('muted_reason');
    table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_active_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['community_id', 'user_id']);
    table.index('community_id');
    table.index('user_id');
    table.index('role');
  });

  // Community posts table
  await knex.schema.createTable('community_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['text', 'photo', 'poll', 'event', 'discussion']).notNullable().defaultTo('text');
    table.text('content').notNullable();
    table.jsonb('media_urls').defaultTo('[]');
    table.integer('like_count').notNullable().defaultTo(0);
    table.integer('comment_count').notNullable().defaultTo(0);
    table.boolean('is_pinned').notNullable().defaultTo(false);
    table.boolean('is_hidden').notNullable().defaultTo(false);
    table.string('hidden_reason');
    table.uuid('hidden_by').references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('community_id');
    table.index(['community_id', 'created_at']);
    table.index(['community_id', 'is_pinned']);
  });

  // Post likes table
  await knex.schema.createTable('post_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['post_id', 'user_id']);
    table.index('post_id');
    table.index('user_id');
  });

  // Post comments table
  await knex.schema.createTable('post_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('parent_comment_id').references('id').inTable('post_comments').onDelete('CASCADE');
    table.text('content').notNullable();
    table.integer('like_count').notNullable().defaultTo(0);
    table.boolean('is_hidden').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('post_id');
    table.index('parent_comment_id');
    table.index(['post_id', 'created_at']);
  });

  // Comment likes table
  await knex.schema.createTable('comment_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('comment_id').notNullable().references('id').inTable('post_comments').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['comment_id', 'user_id']);
  });

  // Community events table
  await knex.schema.createTable('community_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.enum('type', ['meetup', 'virtual', 'activity', 'speed_dating', 'group_date']).notNullable();
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time');
    table.integer('max_participants');
    table.integer('current_participants').notNullable().defaultTo(0);
    table.string('location');
    table.boolean('is_virtual').notNullable().defaultTo(false);
    table.string('virtual_link');
    table.string('cover_image');
    table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('scheduled');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('community_id');
    table.index(['community_id', 'start_time']);
    table.index('start_time');
  });

  // Event RSVPs table
  await knex.schema.createTable('event_rsvps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('community_events').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['going', 'interested', 'not_going']).notNullable();
    table.timestamp('rsvp_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_id', 'user_id']);
    table.index('event_id');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_rsvps');
  await knex.schema.dropTableIfExists('community_events');
  await knex.schema.dropTableIfExists('comment_likes');
  await knex.schema.dropTableIfExists('post_comments');
  await knex.schema.dropTableIfExists('post_likes');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('community_members');
  await knex.schema.dropTableIfExists('communities');
}
